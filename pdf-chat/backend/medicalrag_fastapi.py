"""
Medical RAG Core System - FastAPI Version
Adapted from Streamlit version to work with FastAPI
Handles document processing, embeddings, search, and generation
PDFs stored locally, embeddings only in Supabase
"""

import os
import time
import uuid
import hashlib
import json
import numpy as np
from typing import List, Dict, Any, Tuple, Optional, Callable
from dataclasses import dataclass
from datetime import datetime
from collections import Counter
import networkx as nx
import tempfile
import shutil
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ML imports
torch = None
SentenceTransformer = None
AutoModelForCausalLM = None
AutoTokenizer = None

try:
    import torch
    from sentence_transformers import SentenceTransformer
    from transformers import AutoModelForCausalLM, AutoTokenizer
except ImportError as e:
    logger.error(f"ML libraries not installed: {e}")
    logger.error("Install: pip install torch sentence-transformers transformers")

# Database
try:
    from supabase import create_client
except ImportError:
    create_client = None
    logger.warning("Supabase not installed")

# Document processing
try:
    from langchain_text_splitters import RecursiveCharacterTextSplitter
except ImportError:
    try:
        from langchain.text_splitter import RecursiveCharacterTextSplitter
    except ImportError:
        RecursiveCharacterTextSplitter = None
        logger.warning("LangChain text splitter not available")

try:
    import PyPDF2
    import fitz  # PyMuPDF
    from docx import Document as DocxDocument
except ImportError as e:
    logger.warning(f"Document processing libraries not fully available: {e}")
    PyPDF2 = None
    fitz = None
    DocxDocument = None

# Medical NLP
nlp = None
nlp_model_name = None
try:
    import spacy
    try:
        nlp = spacy.load("en_core_sci_md")
        nlp_model_name = "en_core_sci_md (Medical)"
    except:
        try:
            nlp = spacy.load("en_core_web_sm")
            nlp_model_name = "en_core_web_sm (General)"
        except:
            nlp = None
            nlp_model_name = "Not loaded"
except:
    nlp = None
    nlp_model_name = "Not available"

# Vision model and OCR
try:
    from PIL import Image
    import requests
except ImportError:
    Image = None
    requests = None

# OCR support
try:
    import pytesseract
    from pdf2image import convert_from_bytes
except ImportError:
    pytesseract = None
    convert_from_bytes = None

# Configuration
@dataclass
class Citation:
    source_id: str
    document_name: str
    page_number: int
    confidence_score: float
    text_excerpt: str

class MedicalDocumentChat:
    def __init__(self):
        self.supabase = None
        self.embedding_model = None
        self.text_splitter = None
        self.vision_model = None
        self.vision_tokenizer = None
        self.knowledge_graph = nx.Graph()
        self.chunk_size = 1500
        self.chunk_overlap = 300
        self.local_storage_path = "data/uploads"
        self.current_user_id = "default_user"
        
        # Ensure local storage directory exists
        os.makedirs(self.local_storage_path, exist_ok=True)
        
    def initialize_models(self):
        """Initialize all ML models"""
        try:
            # Initialize embedding model
            logger.info("Loading PubMedBERT embeddings...")
            self.embedding_model = SentenceTransformer('NeuML/pubmedbert-base-embeddings')
            logger.info("✓ Embedding model loaded")
            
            # Initialize text splitter
            if RecursiveCharacterTextSplitter:
                self.text_splitter = RecursiveCharacterTextSplitter(
                    chunk_size=self.chunk_size,
                    chunk_overlap=self.chunk_overlap,
                    length_function=len,
                    separators=["\n\n", "\n", ". ", " ", ""]
                )
            else:
                logger.warning("Text splitter not available")
            
            # Initialize Supabase
            self._initialize_supabase()
            
            # Show spaCy model status
            if nlp_model_name:
                logger.info(f"📊 Entity extraction: {nlp_model_name}")
            
            return True
            
        except Exception as e:
            logger.error(f"Model initialization failed: {e}")
            return False
    
    def _initialize_supabase(self):
        """Initialize Supabase client from environment"""
        try:
            supabase_url = os.getenv("SUPABASE_URL")
            supabase_key = os.getenv("SUPABASE_KEY")
            
            if supabase_url and supabase_key and create_client:
                self.supabase = create_client(supabase_url, supabase_key)
                
                # Test connection
                try:
                    response = self.supabase.table('medical_documents').select("*").limit(1).execute()
                    logger.info("✅ Connected to Supabase")
                except Exception as conn_e:
                    logger.warning(f"⚠️ Supabase connection test failed: {conn_e}")
            else:
                logger.warning("⚠️ Supabase not configured, using local storage only")
                
        except Exception as e:
            logger.warning(f"Supabase connection failed: {e}")
            self.supabase = None
    
    def initialize_supabase(self, url: str, key: str) -> bool:
        """Initialize Supabase client with provided URL and key"""
        try:
            if url and key and create_client:
                self.supabase = create_client(url, key)
                
                # Test connection
                try:
                    response = self.supabase.table('medical_documents').select("*").limit(1).execute()
                    logger.info("✅ Connected to Supabase")
                    return True
                except Exception as conn_e:
                    logger.warning(f"⚠️ Supabase connection test failed: {conn_e}")
                    return False
            else:
                logger.warning("⚠️ Invalid Supabase credentials")
                return False
                
        except Exception as e:
            logger.warning(f"Supabase connection failed: {e}")
            self.supabase = None
            return False
    
    def _calculate_file_hash(self, file_content: bytes) -> str:
        """Calculate SHA-256 hash of file content"""
        return hashlib.sha256(file_content).hexdigest()
    
    def _save_file_locally(self, file_content: bytes, filename: str) -> str:
        """Save file to local storage and return path"""
        file_id = str(uuid.uuid4())
        file_extension = os.path.splitext(filename)[1]
        unique_filename = f"{file_id}{file_extension}"
        local_path = os.path.join(self.local_storage_path, unique_filename)
        
        with open(local_path, 'wb') as f:
            f.write(file_content)
            
        return local_path
    
    def create_document_record(self, filename: str, original_filename: str, 
                             file_type: str, file_size: int, file_hash: str, 
                             local_path: str) -> Optional[str]:
        """Create document record in Supabase and return document ID"""
        if not self.supabase:
            return str(uuid.uuid4())
        
        try:
            response = self.supabase.rpc('create_document_record', {
                'p_user_id': self.current_user_id,
                'p_filename': filename,
                'p_original_filename': original_filename,
                'p_file_type': file_type,
                'p_file_size': file_size,
                'p_file_hash': file_hash,
                'p_local_file_path': local_path
            }).execute()
            
            if response.data:
                return response.data
            else:
                logger.error(f"Failed to create document record: {response}")
                return None
                
        except Exception as e:
            logger.error(f"Error creating document record: {e}")
            return str(uuid.uuid4())
    
    def extract_text_from_pdf(self, file_content: bytes) -> List[Dict[str, Any]]:
        """Extract text from PDF with page numbers using multiple methods"""
        texts = []
        import io
        
        # Method 1: Try PyMuPDF first
        try:
            if fitz:
                doc = fitz.open(stream=file_content, filetype="pdf")
                for page_num in range(len(doc)):
                    page = doc[page_num]
                    text = page.get_text()
                    if text and text.strip():
                        texts.append({
                            'text': text,
                            'page': page_num + 1,
                            'source': 'PyMuPDF'
                        })
                doc.close()
                
                if texts:
                    return texts
        except Exception as e:
            logger.warning(f"PyMuPDF extraction failed: {e}")
        
        # Method 2: Try PyPDF2
        try:
            if PyPDF2:
                pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_content))
                for page_num, page in enumerate(pdf_reader.pages):
                    text = page.extract_text()
                    if text and text.strip():
                        texts.append({
                            'text': text,
                            'page': page_num + 1,
                            'source': 'PyPDF2'
                        })
                
                if texts:
                    return texts
        except Exception as e:
            logger.warning(f"PyPDF2 extraction failed: {e}")
        
        if not texts:
            logger.error("All PDF extraction methods failed")
            
        return texts
    
    def extract_text_from_docx(self, file_content: bytes) -> List[Dict[str, Any]]:
        """Extract text from DOCX"""
        texts = []
        
        try:
            import io
            if DocxDocument:
                doc = DocxDocument(io.BytesIO(file_content))
                full_text = []
                
                for paragraph in doc.paragraphs:
                    if paragraph.text.strip():
                        full_text.append(paragraph.text)
                
                if full_text:
                    texts.append({
                        'text': '\n'.join(full_text),
                        'page': 1,
                        'source': 'python-docx'
                    })
                    
        except Exception as e:
            logger.error(f"DOCX extraction error: {e}")
            
        return texts
    
    def extract_text_from_txt(self, file_content: bytes) -> List[Dict[str, Any]]:
        """Extract text from TXT"""
        try:
            text = file_content.decode('utf-8')
            return [{
                'text': text,
                'page': 1,
                'source': 'text'
            }]
        except UnicodeDecodeError:
            try:
                text = file_content.decode('latin-1')
                return [{
                    'text': text,
                    'page': 1,
                    'source': 'text'
                }]
            except:
                logger.error("Could not decode text file")
                return []
    
    def process_uploaded_file(self, uploaded_file, progress_callback: Optional[Callable] = None) -> Dict[str, Any]:
        """Process uploaded file and store embeddings in Supabase"""
        try:
            if progress_callback:
                progress_callback(0.1, "Reading file...")
            
            # Get file content
            file_content = uploaded_file.read()
            original_filename = uploaded_file.filename
            file_type = original_filename.split('.')[-1].lower()
            file_size = len(file_content)
            
            if progress_callback:
                progress_callback(0.2, "Calculating file hash...")
            
            file_hash = self._calculate_file_hash(file_content)
            
            if progress_callback:
                progress_callback(0.3, "Saving file locally...")
            
            local_path = self._save_file_locally(file_content, original_filename)
            
            if progress_callback:
                progress_callback(0.4, "Creating document record...")
            
            document_id = self.create_document_record(
                filename=original_filename,
                original_filename=original_filename,
                file_type=file_type,
                file_size=file_size,
                file_hash=file_hash,
                local_path=local_path
            )
            
            if not document_id:
                return {'success': False, 'error': 'Failed to create document record'}
            
            if progress_callback:
                progress_callback(0.5, f"Extracting text from {file_type.upper()}...")
            
            # Extract text based on file type
            extracted_texts = []
            
            if file_type == 'pdf':
                extracted_texts = self.extract_text_from_pdf(file_content)
            elif file_type == 'docx':
                extracted_texts = self.extract_text_from_docx(file_content)
            elif file_type == 'txt':
                extracted_texts = self.extract_text_from_txt(file_content)
            else:
                return {'success': False, 'error': f'Unsupported file type: {file_type}'}
            
            if not extracted_texts:
                return {'success': False, 'error': 'No text could be extracted from the file'}
            
            if progress_callback:
                progress_callback(0.6, "Processing text chunks...")
            
            # Process extracted text
            all_chunks = []
            all_entities = []
            total_pages = len(extracted_texts)
            
            for idx, text_info in enumerate(extracted_texts):
                if progress_callback:
                    progress = 0.6 + (0.2 * (idx / total_pages))
                    progress_callback(progress, f"Processing page {idx+1}/{total_pages}...")
                
                text = text_info['text']
                page_number = text_info['page']
                
                # Split text into chunks
                chunks = self.text_splitter.split_text(text)
                
                for i, chunk in enumerate(chunks):
                    # Generate embedding
                    embedding = self.embedding_model.encode(chunk)
                    
                    # Extract entities
                    entities = self._extract_entities(chunk, original_filename)
                    
                    chunk_data = {
                        'chunk_idx': i,
                        'text': chunk,
                        'page_number': page_number,
                        'type': 'text',
                        'token_count': len(chunk.split()),
                        'embedding': embedding.tolist(),
                        'metadata': {
                            'source': text_info['source'],
                            'document_id': document_id
                        }
                    }
                    
                    all_chunks.append(chunk_data)
                    all_entities.extend(entities)
            
            if progress_callback:
                progress_callback(0.85, "Storing embeddings in database...")
            
            # Store chunks in Supabase
            if self.supabase:
                try:
                    chunks_json = json.dumps(all_chunks)
                    response = self.supabase.rpc('add_document_chunks', {
                        'p_document_id': document_id,
                        'p_chunks': chunks_json
                    }).execute()
                    
                    if response.error:
                        logger.error(f"Error storing chunks: {response.error}")
                        
                except Exception as e:
                    logger.error(f"Error storing chunks in Supabase: {e}")
            
            # Store entities
            if self.supabase and all_entities:
                self._store_entities(document_id, all_entities)
            
            # Build knowledge graph
            self._build_knowledge_graph(all_entities)
            
            if progress_callback:
                progress_callback(1.0, "Complete!")
            
            return {
                'success': True,
                'document_id': document_id,
                'num_chunks': len(all_chunks),
                'num_entities': len(all_entities),
                'local_path': local_path,
                'entities': all_entities[:10],
                'chunks': all_chunks
            }
            
        except Exception as e:
            logger.error(f"Error processing file: {e}")
            return {'success': False, 'error': str(e)}
    
    def process_document_from_supabase(self, document_id: str, file_content: bytes, 
                                       filename: str, user_id: str) -> Dict[str, Any]:
        """Process document from Supabase Storage - only store embeddings, not the file"""
        try:
            logger.info(f"Processing document {document_id} from Supabase")
            
            # Get file type
            file_type = filename.split('.')[-1].lower()
            
            # Extract text based on file type
            extracted_texts = []
            
            if file_type == 'pdf':
                extracted_texts = self.extract_text_from_pdf(file_content)
            elif file_type == 'docx':
                extracted_texts = self.extract_text_from_docx(file_content)
            elif file_type == 'txt':
                extracted_texts = self.extract_text_from_txt(file_content)
            else:
                return {'success': False, 'error': f'Unsupported file type: {file_type}'}
            
            if not extracted_texts:
                return {'success': False, 'error': 'No text could be extracted from the file'}
            
            # Process extracted text
            all_chunks = []
            all_entities = []
            
            for page_data in extracted_texts:
                text = page_data['text']
                page_num = page_data.get('page', 1)
                
                # Split into chunks
                chunks = self.text_splitter.split_text(text)
                
                for chunk_idx, chunk_text in enumerate(chunks):
                    # Extract entities
                    entities = self._extract_entities(chunk_text, filename)
                    all_entities.extend(entities)
                    
                    # Generate embedding
                    embedding = self.embedding_model.encode(chunk_text).tolist()
                    
                    chunk_data = {
                        'document_id': document_id,
                        'user_id': user_id,
                        'chunk_idx': len(all_chunks),
                        'chunk_text': chunk_text,
                        'page_number': page_num,
                        'token_count': len(chunk_text.split()),
                        'embedding': embedding,
                        'metadata': {}
                    }
                    all_chunks.append(chunk_data)
            
            # Store chunks in Supabase
            if self.supabase and all_chunks:
                try:
                    # Insert chunks in batches
                    batch_size = 100
                    for i in range(0, len(all_chunks), batch_size):
                        batch = all_chunks[i:i + batch_size]
                        self.supabase.table('medical_chunks').insert(batch).execute()
                    
                    logger.info(f"Stored {len(all_chunks)} chunks for document {document_id}")
                except Exception as e:
                    logger.error(f"Error storing chunks: {e}")
                    return {'success': False, 'error': f'Failed to store embeddings: {str(e)}'}
            
            # Store entities
            if all_entities:
                self._store_entities(document_id, all_entities, user_id)
            
            return {
                'success': True,
                'document_id': document_id,
                'num_chunks': len(all_chunks),
                'num_entities': len(all_entities),
                'chunks': all_chunks
            }
            
        except Exception as e:
            logger.error(f"Error processing document from Supabase: {e}")
            return {'success': False, 'error': str(e)}
    
    def _extract_entities(self, text: str, document_name: str) -> List[Dict[str, Any]]:
        """Extract medical entities using spaCy"""
        entities = []
        
        if not nlp:
            return entities
        
        try:
            text_sample = text[:5000] if len(text) > 5000 else text
            doc = nlp(text_sample)
            
            for ent in doc.ents:
                entity_data = {
                    'name': ent.text,
                    'type': ent.label_,
                    'text': ent.text,
                    'start_char': ent.start_char,
                    'end_char': ent.end_char,
                    'confidence': 0.8,
                    'document_name': document_name,
                    'count': 1
                }
                entities.append(entity_data)
            
            return entities
            
        except Exception as e:
            logger.warning(f"Entity extraction error: {e}")
            return []
    
    def _store_entities(self, document_id: str, entities: List[Dict[str, Any]], user_id: str = None):
        """Store entities in Supabase"""
        if not self.supabase:
            return
        
        # Use provided user_id or fall back to current_user_id
        uid = user_id or self.current_user_id
        
        try:
            for entity in entities:
                entity_data = {
                    'document_id': document_id,
                    'user_id': uid,  # ✓ Add user_id
                    'entity_name': entity['name'],
                    'entity_type': entity['type'],
                    'entity_text': entity['text'],
                    'start_char': entity.get('start_char'),
                    'end_char': entity.get('end_char'),
                    'confidence_score': entity.get('confidence', 0.8)
                }
                
                self.supabase.table('medical_entities').insert(entity_data).execute()
                
        except Exception as e:
            logger.warning(f"Error storing entities: {e}")
    
    def _build_knowledge_graph(self, entities: List[Dict[str, Any]]):
        """Build knowledge graph from entities"""
        try:
            for entity in entities:
                node_id = f"{entity['name']}_{entity['type']}"
                self.knowledge_graph.add_node(
                    node_id,
                    name=entity['name'],
                    type=entity['type'],
                    confidence=entity.get('confidence', 0.8)
                )
        except Exception as e:
            logger.warning(f"Knowledge graph error: {e}")
    
    def hybrid_search(self, query: str, k: int = 5, alpha: float = 0.7, user_id: str = None, document_id: str = None) -> List[Dict[str, Any]]:
        """Hybrid search combining semantic and keyword search"""
        try:
            query_embedding = self.embedding_model.encode(query)
            uid = user_id or self.current_user_id
            
            if self.supabase:
                response = self.supabase.rpc('hybrid_search', {
                    'query_text': query,
                    'query_embedding': query_embedding.tolist(),
                    'doc_id': document_id,
                    'user_id_param': uid,  # ✓ Pass actual user_id
                    'match_threshold': 0.3,
                    'match_count': k,
                    'semantic_weight': alpha
                }).execute()
                
                if response.data:
                    return response.data
            
            return []
                
        except Exception as e:
            logger.error(f"Search error: {e}")
            return []
    
    def generate_answer_with_citations(self, query: str, search_results: List[Dict[str, Any]]) -> Tuple[str, List[Citation], float]:
        """Generate answer with citations"""
        if not search_results:
            return "I couldn't find relevant information in the uploaded documents.", [], 0.0
        
        try:
            context_parts = []
            citations = []
            
            for i, result in enumerate(search_results):
                chunk_text = result.get('chunk_text', '')
                document_name = result.get('filename', 'Unknown Document')
                page_number = result.get('page_number', 1)
                similarity = result.get('similarity', result.get('hybrid_score', 0.0))
                
                context_parts.append(f"[{i+1}] {chunk_text}")
                
                citation = Citation(
                    source_id=f"[{i+1}]",
                    document_name=document_name,
                    page_number=page_number,
                    confidence_score=similarity * 100,
                    text_excerpt=chunk_text[:200] + "..." if len(chunk_text) > 200 else chunk_text
                )
                citations.append(citation)
            
            context = "\n\n".join(context_parts)
            answer, confidence = self._generate_llm_answer(query, context)
            
            avg_similarity = np.mean([c.confidence_score for c in citations]) if citations else 0.0
            llm_confidence = confidence * 100 if confidence <= 1.0 else confidence
            overall_confidence = min(llm_confidence, avg_similarity)
            
            return answer, citations, overall_confidence
            
        except Exception as e:
            logger.error(f"Answer generation error: {e}")
            return "I encountered an error while generating the answer.", [], 0.0
    
    def _generate_llm_answer(self, query: str, context: str) -> Tuple[str, float]:
        """Generate answer using Cerebras API"""
        try:
            api_key = os.getenv("CEREBRAS_API_KEY")
            
            if api_key and api_key != "demo_mode":
                return self._call_cerebras_api(query, context, api_key)
            else:
                return self._generate_fallback_answer(query, context)
                
        except Exception as e:
            logger.warning(f"LLM generation error: {e}")
            return self._generate_fallback_answer(query, context)
    
    def _call_cerebras_api(self, query: str, context: str, api_key: str) -> Tuple[str, float]:
        """Call Cerebras API"""
        try:
            import requests
            
            prompt = f"""You are a medical AI assistant. Extract and summarize ONLY what is written in the context below.

=== CONTEXT FROM UPLOADED DOCUMENTS ===
{context}
=== END OF CONTEXT ===

User Question: {query}

Answer using ONLY the context above. Cite sources using [1], [2], etc."""

            response = requests.post(
                "https://api.cerebras.ai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "llama-3.3-70b",
                    "messages": [
                        {"role": "system", "content": "You are a document extraction assistant."},
                        {"role": "user", "content": prompt}
                    ],
                    "max_tokens": 2500,
                    "temperature": 0.1
                }
            )
            
            if response.status_code == 200:
                answer = response.json()['choices'][0]['message']['content']
                return answer, 0.85
            else:
                raise Exception(f"API error: {response.status_code}")
                
        except Exception as e:
            logger.warning(f"Cerebras API error: {e}")
            return self._generate_fallback_answer(query, context)
    
    def _generate_fallback_answer(self, query: str, context: str) -> Tuple[str, float]:
        """Generate fallback answer"""
        answer = f"Based on the documents:\n\n{context[:500]}..."
        return answer, 0.6
    
    def get_user_documents(self) -> List[Dict[str, Any]]:
        """Get list of user's documents"""
        if not self.supabase:
            return []
        
        try:
            response = self.supabase.rpc('list_user_documents', {
                'p_user_id': self.current_user_id,
                'p_limit': 50,
                'p_offset': 0
            }).execute()
            
            return response.data if response.data else []
            
        except Exception as e:
            logger.error(f"Error fetching documents: {e}")
            return []
    
    def delete_document(self, document_id: str) -> bool:
        """Delete document"""
        if not self.supabase:
            return False
        
        try:
            response = self.supabase.rpc('delete_document', {
                'p_document_id': document_id,
                'p_user_id': self.current_user_id
            }).execute()
            
            return response.data if response.data is not None else False
            
        except Exception as e:
            logger.error(f"Error deleting document: {e}")
            return False
    
    def get_database_stats(self) -> Dict[str, Any]:
        """Get database statistics"""
        if not self.supabase:
            return {
                'total_documents': 0,
                'total_chunks': 0,
                'total_entities': 0,
                'storage_used_mb': 0
            }
        
        try:
            response = self.supabase.rpc('get_database_stats', {
                'p_user_id': self.current_user_id
            }).execute()
            
            return response.data[0] if response.data else {}
            
        except Exception as e:
            logger.error(f"Error getting stats: {e}")
            return {}
    
    def set_user_context(self, user_id: str):
        """Set the current user context"""
        self.current_user_id = user_id
