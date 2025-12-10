"""
Medical RAG Core System - Updated Version
Handles document processing, embeddings, search, and generation
PDFs stored locally, embeddings only in Supabase
"""

import os
import time
import uuid
import hashlib
import json
import numpy as np
import streamlit as st
from typing import List, Dict, Any, Tuple, Optional
from dataclasses import dataclass
from datetime import datetime
from collections import Counter
import networkx as nx
import tempfile
import shutil

# ML imports
try:
    import torch
    from sentence_transformers import SentenceTransformer
    from transformers import AutoModelForCausalLM, AutoTokenizer
except ImportError:
    st.error("Install: pip install torch sentence-transformers transformers")
    st.stop()

# Database
try:
    from supabase import create_client
except ImportError:
    create_client = None

# Document processing
try:
    from langchain_text_splitters import RecursiveCharacterTextSplitter
except ImportError:
    try:
        from langchain.text_splitter import RecursiveCharacterTextSplitter
    except ImportError:
        RecursiveCharacterTextSplitter = None

try:
    import PyPDF2
    import fitz  # PyMuPDF
    from docx import Document as DocxDocument
except ImportError:
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
    from transformers import AutoModelForCausalLM, AutoTokenizer
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
        self.current_user_id = "default_user"  # Can be overridden
        
        # Ensure local storage directory exists
        os.makedirs(self.local_storage_path, exist_ok=True)
        
    def initialize_models(self):
        """Initialize all ML models"""
        try:
            # Initialize embedding model
            st.info("Loading PubMedBERT embeddings (first time may take 1-2 minutes)...")
            self.embedding_model = SentenceTransformer('NeuML/pubmedbert-base-embeddings')
            st.success("✓ Embedding model loaded")
            
            # Initialize text splitter
            self.text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=self.chunk_size,
                chunk_overlap=self.chunk_overlap,
                length_function=len,
                separators=["\n\n", "\n", ". ", " ", ""]
            )
            
            # Initialize vision model (optional) - DISABLED for faster startup
            # Uncomment if you need image analysis capabilities
            # try:
            #     self.vision_tokenizer = AutoTokenizer.from_pretrained("vikhyatk/moondream2", trust_remote_code=True)
            #     self.vision_model = AutoModelForCausalLM.from_pretrained(
            #         "vikhyatk/moondream2", 
            #         trust_remote_code=True,
            #         dtype=torch.float16,
            #         device_map="auto"
            #     ).eval()
            # except Exception as e:
            #     st.warning(f"Vision model not available: {e}")
            st.info("Vision model disabled for faster startup")
                
            # Initialize Supabase
            self._initialize_supabase()
            
            # Show spaCy model status
            if nlp_model_name:
                st.info(f"📊 Entity extraction: {nlp_model_name}")
            
            return True
            
        except Exception as e:
            st.error(f"Model initialization failed: {e}")
            return False
    
    def _initialize_supabase(self):
        """Initialize Supabase client from secrets"""
        try:
            # Try to get from streamlit secrets first
            try:
                supabase_url = st.secrets.get("SUPABASE_URL", os.getenv("SUPABASE_URL"))
                supabase_key = st.secrets.get("SUPABASE_KEY", os.getenv("SUPABASE_KEY"))
            except:
                # Fallback to environment variables
                supabase_url = os.getenv("SUPABASE_URL")
                supabase_key = os.getenv("SUPABASE_KEY")
            
            # Debug info (comment out in production)
            # st.write(f"Debug - Supabase URL found: {bool(supabase_url)}")
            # st.write(f"Debug - Supabase Key found: {bool(supabase_key)}")
            # st.write(f"Debug - Create client available: {bool(create_client)}")
            
            if supabase_url and supabase_key and create_client:
                self.supabase = create_client(supabase_url, supabase_key)
                
                # Test connection
                try:
                    response = self.supabase.table('medical_documents').select("*").limit(1).execute()
                    st.success("✅ Connected to Supabase")
                except Exception as conn_e:
                    st.warning(f"⚠️ Supabase connection test failed: {conn_e}")
                    st.info("This is OK if you haven't set up the database yet")
            else:
                st.warning("⚠️ Supabase not configured, using local storage only")
                
        except Exception as e:
            st.warning(f"Supabase connection failed: {e}")
            self.supabase = None
    
    def initialize_supabase(self, url: str, key: str) -> bool:
        """Initialize Supabase client with provided URL and key"""
        try:
            if url and key and create_client:
                self.supabase = create_client(url, key)
                
                # Test connection
                try:
                    response = self.supabase.table('medical_documents').select("*").limit(1).execute()
                    st.success("✅ Connected to Supabase")
                    return True
                except Exception as conn_e:
                    st.warning(f"⚠️ Supabase connection test failed: {conn_e}")
                    st.info("This is OK if you haven't set up the database yet")
                    return False
            else:
                st.warning("⚠️ Invalid Supabase credentials")
                return False
                
        except Exception as e:
            st.warning(f"Supabase connection failed: {e}")
            self.supabase = None
            return False
    
    def _calculate_file_hash(self, file_content: bytes) -> str:
        """Calculate SHA-256 hash of file content"""
        return hashlib.sha256(file_content).hexdigest()
    
    def _save_file_locally(self, file_content: bytes, filename: str) -> str:
        """Save file to local storage and return path"""
        # Create unique filename
        file_id = str(uuid.uuid4())
        file_extension = os.path.splitext(filename)[1]
        unique_filename = f"{file_id}{file_extension}"
        local_path = os.path.join(self.local_storage_path, unique_filename)
        
        # Save file
        with open(local_path, 'wb') as f:
            f.write(file_content)
            
        return local_path
    
    def create_document_record(self, filename: str, original_filename: str, 
                             file_type: str, file_size: int, file_hash: str, 
                             local_path: str) -> Optional[str]:
        """Create document record in Supabase and return document ID"""
        if not self.supabase:
            # Generate local document ID
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
            })
            
            if response.data:
                return response.data
            else:
                st.error(f"Failed to create document record: {response}")
                return None
                
        except Exception as e:
            st.error(f"Error creating document record: {e}")
            return str(uuid.uuid4())  # Fallback to local ID
    
    def extract_text_from_pdf(self, file_content: bytes) -> List[Dict[str, Any]]:
        """Extract text from PDF with page numbers using multiple methods"""
        texts = []
        import io
        
        # Method 1: Try PyMuPDF first (best for complex PDFs)
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
            st.warning(f"PyMuPDF extraction failed: {e}")
        
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
            st.warning(f"PyPDF2 extraction failed: {e}")
        
        # Method 3: Try pypdf (newer version)
        try:
            import pypdf
            pdf_reader = pypdf.PdfReader(io.BytesIO(file_content))
            for page_num, page in enumerate(pdf_reader.pages):
                text = page.extract_text()
                if text and text.strip():
                    texts.append({
                        'text': text,
                        'page': page_num + 1,
                        'source': 'pypdf'
                    })
            
            if texts:
                return texts
        except Exception as e:
            st.warning(f"pypdf extraction failed: {e}")
        
        # Method 4: Try pdfplumber as last resort
        try:
            import pdfplumber
            with pdfplumber.open(io.BytesIO(file_content)) as pdf:
                for page_num, page in enumerate(pdf.pages):
                    text = page.extract_text()
                    if text and text.strip():
                        texts.append({
                            'text': text,
                            'page': page_num + 1,
                            'source': 'pdfplumber'
                        })
            
            if texts:
                return texts
        except Exception as e:
            st.warning(f"pdfplumber extraction failed: {e}")
        
        # Method 5: OCR for image-based PDFs
        if not texts and pytesseract and convert_from_bytes:
            try:
                st.info("Attempting OCR extraction (this may take longer)...")
                images = convert_from_bytes(file_content)
                
                for page_num, image in enumerate(images):
                    text = pytesseract.image_to_string(image)
                    if text and text.strip():
                        texts.append({
                            'text': text,
                            'page': page_num + 1,
                            'source': 'OCR'
                        })
                
                if texts:
                    st.success(f"Successfully extracted text using OCR from {len(texts)} pages")
                    return texts
            except Exception as e:
                st.warning(f"OCR extraction failed: {e}")
        
        if not texts:
            st.error("All PDF extraction methods failed. The PDF might be corrupted or require Tesseract OCR installation.")
            
        return texts
    
    def extract_text_from_docx(self, file_content: bytes) -> List[Dict[str, Any]]:
        """Extract text from DOCX"""
        texts = []
        
        try:
            import io
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
            st.error(f"DOCX extraction error: {e}")
            
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
                st.error("Could not decode text file")
                return []
    
    def process_uploaded_file(self, uploaded_file, progress_callback=None) -> Dict[str, Any]:
        """Process uploaded file and store embeddings in Supabase"""
        try:
            if progress_callback:
                progress_callback(0.1, "Reading file...")
            
            # Get file content
            file_content = uploaded_file.read()
            original_filename = uploaded_file.name
            file_type = original_filename.split('.')[-1].lower()
            file_size = len(file_content)
            
            if progress_callback:
                progress_callback(0.2, "Calculating file hash...")
            
            # Calculate file hash
            file_hash = self._calculate_file_hash(file_content)
            
            if progress_callback:
                progress_callback(0.3, "Saving file locally...")
            
            # Save file locally
            local_path = self._save_file_locally(file_content, original_filename)
            
            if progress_callback:
                progress_callback(0.4, "Creating document record...")
            
            # Create document record
            document_id = self.create_document_record(
                filename=original_filename,
                original_filename=original_filename,
                file_type=file_type,
                file_size=file_size,
                file_hash=file_hash,
                local_path=local_path
            )
            
            if not document_id:
                return {
                    'success': False,
                    'error': 'Failed to create document record'
                }
            
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
                return {
                    'success': False,
                    'error': f'Unsupported file type: {file_type}'
                }
            
            if not extracted_texts:
                return {
                    'success': False,
                    'error': 'No text could be extracted from the file'
                }
            
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
                    
                    # Store chunk data
                    chunk_data = {
                        'chunk_idx': i,
                        'text': chunk,
                        'page_number': page_number,
                        'type': 'text',
                        'token_count': len(chunk.split()),
                        'embedding': embedding.tolist(),  # Convert to list for JSON
                        'metadata': {
                            'source': text_info['source'],
                            'document_id': document_id
                        }
                    }
                    
                    all_chunks.append(chunk_data)
                    all_entities.extend(entities)
            
            if progress_callback:
                progress_callback(0.85, "Storing embeddings in database...")
            
            # Store chunks and embeddings in Supabase
            if self.supabase:
                try:
                    # Use the database function to add chunks
                    chunks_json = json.dumps(all_chunks)
                    response = self.supabase.rpc('add_document_chunks', {
                        'p_document_id': document_id,
                        'p_chunks': chunks_json
                    })
                    
                    if response.error:
                        st.error(f"Error storing chunks: {response.error}")
                        
                except Exception as e:
                    st.error(f"Error storing chunks in Supabase: {e}")
            
            # Store entities
            if self.supabase and all_entities:
                self._store_entities(document_id, all_entities)
            
            # Build knowledge graph
            self._build_knowledge_graph(all_entities)
            
            # Store chunks in session state for local search
            if 'local_chunks' not in st.session_state:
                st.session_state.local_chunks = {}
            st.session_state.local_chunks[document_id] = all_chunks
            
            if progress_callback:
                progress_callback(1.0, "Complete!")
            
            return {
                'success': True,
                'document_id': document_id,
                'num_chunks': len(all_chunks),
                'num_entities': len(all_entities),
                'local_path': local_path,
                'entities': all_entities[:10],  # Return first 10 entities
                'chunks': all_chunks  # Return chunks for UI
            }
            
        except Exception as e:
            st.error(f"Error processing file: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _extract_entities(self, text: str, document_name: str) -> List[Dict[str, Any]]:
        """Extract medical entities using spaCy/scispacy"""
        entities = []
        
        if not nlp:
            # Only show warning once per session
            if 'spacy_warning_shown' not in st.session_state:
                st.warning("⚠️ spaCy not loaded - entity extraction disabled. Install with: pip install spacy && python -m spacy download en_core_web_sm")
                st.session_state.spacy_warning_shown = True
            return entities
        
        try:
            # Limit text length for performance
            text_sample = text[:5000] if len(text) > 5000 else text
            doc = nlp(text_sample)
            
            # Define medical entity types of interest (scispacy)
            medical_entity_types = [
                'DISEASE', 'DISORDER', 'SYNDROME',
                'DRUG', 'CHEMICAL', 'MEDICINE',
                'SYMPTOM', 'SIGN', 'FINDING',
                'ANATOMY', 'BODY_PART', 'ORGAN',
                'PROCEDURE', 'TREATMENT', 'THERAPY',
                'DOSAGE', 'CONTRAINDICATION', 'INDICATION'
            ]
            
            # Standard spaCy entity types that might be relevant
            standard_entity_types = ['PERSON', 'ORG', 'GPE', 'DATE', 'CARDINAL']
            
            for ent in doc.ents:
                # Check if it's a medical entity (scispacy) or standard entity
                is_medical = any(entity_type in ent.label_ for entity_type in medical_entity_types)
                is_standard = ent.label_ in standard_entity_types
                
                if is_medical or is_standard:
                    entity_data = {
                        'name': ent.text,
                        'type': ent.label_,
                        'text': ent.text,
                        'start_char': ent.start_char,
                        'end_char': ent.end_char,
                        'confidence': 0.8 if is_medical else 0.6,
                        'document_name': document_name,
                        'count': 1
                    }
                    entities.append(entity_data)
        
            # Count and deduplicate entities
            entity_counts = {}
            for entity in entities:
                key = (entity['name'].lower(), entity['type'])
                if key in entity_counts:
                    entity_counts[key]['count'] += 1
                else:
                    entity_counts[key] = entity.copy()
            
            # Convert back to list and sort by count
            unique_entities = list(entity_counts.values())
            unique_entities.sort(key=lambda x: x['count'], reverse=True)
            
            return unique_entities
            
        except Exception as e:
            st.warning(f"Entity extraction error: {e}")
            return []
    
    def _store_entities(self, document_id: str, entities: List[Dict[str, Any]]):
        """Store entities in Supabase"""
        if not self.supabase:
            return
        
        try:
            for entity in entities:
                entity_data = {
                    'document_id': document_id,
                    'entity_name': entity['name'],
                    'entity_type': entity['type'],
                    'entity_text': entity['text'],
                    'start_char': entity.get('start_char'),
                    'end_char': entity.get('end_char'),
                    'confidence_score': entity.get('confidence', 0.8)
                }
                
                self.supabase.table('medical_entities').insert(entity_data).execute()
                
        except Exception as e:
            st.warning(f"Error storing entities: {e}")
    
    def _build_knowledge_graph(self, entities: List[Dict[str, Any]]):
        """Build knowledge graph from entities"""
        try:
            # Add entities as nodes
            for entity in entities:
                node_id = f"{entity['name']}_{entity['type']}"
                self.knowledge_graph.add_node(
                    node_id,
                    name=entity['name'],
                    type=entity['type'],
                    confidence=entity.get('confidence', 0.8)
                )
            
            # Add relationships (simplified - in production, use more sophisticated NLP)
            for i, entity1 in enumerate(entities):
                for entity2 in entities[i+1:]:
                    # Simple relationship detection based on co-occurrence
                    if entity1['type'] == 'DRUG' and entity2['type'] == 'DISEASE':
                        self.knowledge_graph.add_edge(
                            f"{entity1['name']}_{entity1['type']}",
                            f"{entity2['name']}_{entity2['type']}",
                            relationship='TREATS',
                            confidence=0.7
                        )
                    elif entity1['type'] == 'DISEASE' and entity2['type'] == 'SYMPTOM':
                        self.knowledge_graph.add_edge(
                            f"{entity1['name']}_{entity1['type']}",
                            f"{entity2['name']}_{entity2['type']}",
                            relationship='CAUSES',
                            confidence=0.7
                        )
                        
        except Exception as e:
            st.warning(f"Knowledge graph error: {e}")
    
    def hybrid_search(self, query: str, k: int = 5, alpha: float = 0.7) -> List[Dict[str, Any]]:
        """Hybrid search combining semantic and keyword search"""
        try:
            # Generate query embedding
            query_embedding = self.embedding_model.encode(query)
            
            if self.supabase:
                # Use Supabase hybrid search function
                response = self.supabase.rpc('hybrid_search', {
                    'query_text': query,
                    'query_embedding': query_embedding.tolist(),
                    'match_threshold': 0.3,
                    'match_count': k,
                    'semantic_weight': alpha,
                    'user_id_filter': self.current_user_id
                })
                
                if response.data:
                    return response.data
            else:
                # Fallback to local search (simplified)
                return self._local_search_fallback(query, k)
                
        except Exception as e:
            st.error(f"Search error: {e}")
            return []
    
    def _local_search_fallback(self, query: str, k: int = 5) -> List[Dict[str, Any]]:
        """Local search fallback when Supabase is not available"""
        try:
            # Get documents from session state
            if 'local_documents' not in st.session_state or not st.session_state.local_documents:
                st.warning("No documents found in local storage")
                return []
            
            # Get local chunks if stored
            if 'local_chunks' not in st.session_state:
                st.session_state.local_chunks = {}
            
            results = []
            query_lower = query.lower()
            query_embedding = self.embedding_model.encode(query)
            
            # Search through stored chunks
            for doc_id, doc_data in st.session_state.local_documents.items():
                # Get chunks for this document
                if doc_id in st.session_state.local_chunks:
                    chunks = st.session_state.local_chunks[doc_id]
                    
                    for chunk in chunks:
                        # Calculate similarity
                        chunk_embedding = chunk.get('embedding')
                        if chunk_embedding is not None:
                            chunk_embedding = np.array(chunk_embedding)
                            similarity = np.dot(query_embedding, chunk_embedding) / (
                                np.linalg.norm(query_embedding) * np.linalg.norm(chunk_embedding)
                            )
                        else:
                            # Fallback to keyword matching
                            chunk_text = chunk.get('text', '').lower()
                            similarity = sum(1 for term in query_lower.split() if term in chunk_text) / len(query_lower.split())
                        
                        if similarity > 0.3:  # Threshold
                            results.append({
                                'document_id': doc_id,
                                'filename': doc_data['document_name'],
                                'chunk_text': chunk.get('text', ''),
                                'page_number': chunk.get('page_number', 1),
                                'similarity': float(similarity),
                                'hybrid_score': float(similarity)
                            })
            
            # Sort by similarity and return top k
            results.sort(key=lambda x: x['hybrid_score'], reverse=True)
            
            if not results:
                st.info(f"No relevant chunks found for query: '{query}'. Try different keywords.")
            
            return results[:k]
            
        except Exception as e:
            st.warning(f"Local search error: {e}")
            return []
    
    def generate_answer_with_citations(self, query: str, search_results: List[Dict[str, Any]]) -> Tuple[str, List[Citation], float]:
        """Generate answer with citations"""
        if not search_results:
            return "I couldn't find relevant information in the uploaded documents.", [], 0.0
        
        try:
            # Prepare context from search results
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
            
            # Generate answer using Cerebras API
            answer, confidence = self._generate_llm_answer(query, context)
            
            # Calculate overall confidence (both should be 0-100 scale)
            avg_similarity = np.mean([c.confidence_score for c in citations]) if citations else 0.0
            llm_confidence = confidence * 100 if confidence <= 1.0 else confidence  # Ensure 0-100 scale
            overall_confidence = min(llm_confidence, avg_similarity)
            
            return answer, citations, overall_confidence
            
        except Exception as e:
            st.error(f"Answer generation error: {e}")
            return "I encountered an error while generating the answer.", [], 0.0
    
    def _generate_llm_answer(self, query: str, context: str) -> Tuple[str, float]:
        """Generate answer using LLM"""
        try:
            # Try Cerebras API first
            api_key = st.secrets.get("CEREBRAS_API_KEY", os.getenv("CEREBRAS_API_KEY"))
            
            if api_key and api_key != "demo_mode":
                return self._call_cerebras_api(query, context, api_key)
            else:
                return self._generate_fallback_answer(query, context)
                
        except Exception as e:
            st.warning(f"LLM generation error: {e}")
            return self._generate_fallback_answer(query, context)
    
    def _call_cerebras_api(self, query: str, context: str, api_key: str) -> Tuple[str, float]:
        """Call Cerebras API for answer generation"""
        try:
            import requests
            
            prompt = f"""You are a medical ai assistant and document extraction assistant. Extract and summarize ONLY what is written in the context below,give clear and easy explaination.

=== CONTEXT FROM UPLOADED DOCUMENTS ===
{context}
=== END OF CONTEXT ===

User Question: {query}

⚠️ CRITICAL ANTI-HALLUCINATION RULES:

1. READ THE CONTEXT CAREFULLY - Every word of your answer must come from the context above
2. NO EXTERNAL KNOWLEDGE - Do not use any medical knowledge you have. ONLY use what's in the context
3. VERIFY BEFORE WRITING - Before making any claim, check if it's explicitly in the context
4. CITE EVERYTHING - Use [1], [2], [3] etc. for EVERY single fact. Each citation number corresponds to a chunk above
5. DIRECT QUOTES - When possible, quote the exact words from the context
6. ADMIT GAPS - If the context doesn't contain information, say: "This information is not found in the uploaded documents"
7. NO INVENTED REFERENCES - Do not create fake citations like [7], [98], [152] if they don't exist in the context
8. NO ASSUMPTIONS - Do not infer, assume, or extrapolate beyond what's explicitly written
9. NO GENERIC STATEMENTS - Avoid general medical facts not present in the context
10. DOUBLE-CHECK - Before finishing, verify every sentence is supported by the context

WRONG EXAMPLE (Hallucination):
"The paper references the Global Burden of Disease Study 2017 [9] and discusses terlipressin [152]..."
❌ BAD - These references are invented if not in context

RIGHT EXAMPLE (Grounded):
"According to the document, the paper discusses portal hypertension and acute-on-chronic liver failure [1]. The authors mention treatment options including non-selective β-blockers [2]..."
✅ GOOD - Only uses information from context with proper citations

Now answer the question using ONLY the context above:"""

            response = requests.post(
                "https://api.cerebras.ai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "llama-3.3-70b",
                    "messages": [
                        {
                            "role": "system", 
                            "content": "You are a document extraction assistant. You ONLY provide information from the given context. You NEVER use external knowledge. If information is not in the context, you say so."
                        },
                        {
                            "role": "user", 
                            "content": prompt
                        }
                    ],
                    "max_tokens": 2500,
                    "temperature": 0.1
                }
            )
            
            if response.status_code == 200:
                answer = response.json()['choices'][0]['message']['content']
                confidence = 0.85  # Default confidence for API responses
                return answer, confidence
            else:
                raise Exception(f"API error: {response.status_code}")
                
        except Exception as e:
            st.warning(f"Cerebras API error: {e}")
            return self._generate_fallback_answer(query, context)
    
    def _generate_fallback_answer(self, query: str, context: str) -> Tuple[str, float]:
        """Generate fallback answer without API"""
        # Simple keyword-based fallback
        query_lower = query.lower()
        context_lower = context.lower()
        
        if any(word in context_lower for word in query_lower.split() if len(word) > 3):
            answer = f"Based on the provided medical documents, here's what I found regarding {query}:\n\n{context[:500]}...\n\n⚠️ This is a simplified response. For complete medical information, please consult the full documents and healthcare professionals."
            confidence = 0.6
        else:
            answer = f"I couldn't find specific information about '{query}' in the uploaded documents. Please try rephrasing your question or upload more relevant medical documents."
            confidence = 0.2
        
        return answer, confidence
    
    def get_user_documents(self) -> List[Dict[str, Any]]:
        """Get list of user's documents"""
        if not self.supabase:
            return []
        
        try:
            response = self.supabase.rpc('list_user_documents', {
                'p_user_id': self.current_user_id,
                'p_limit': 50,
                'p_offset': 0
            })
            
            return response.data if response.data else []
            
        except Exception as e:
            st.error(f"Error fetching documents: {e}")
            return []
    
    def delete_document(self, document_id: str) -> bool:
        """Delete document and all related data"""
        if not self.supabase:
            return False
        
        try:
            # Get document info first to delete local file
            doc_response = self.supabase.rpc('get_document_by_id', {
                'p_document_id': document_id,
                'p_user_id': self.current_user_id
            })
            
            if doc_response.data:
                doc_info = doc_response.data[0]
                local_path = doc_info.get('local_file_path')
                
                # Delete local file
                if local_path and os.path.exists(local_path):
                    os.remove(local_path)
            
            # Delete from database (will cascade)
            response = self.supabase.rpc('delete_document', {
                'p_document_id': document_id,
                'p_user_id': self.current_user_id
            })
            
            return response.data if response.data is not None else False
            
        except Exception as e:
            st.error(f"Error deleting document: {e}")
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
            })
            
            return response.data[0] if response.data else {}
            
        except Exception as e:
            st.error(f"Error getting stats: {e}")
            return {}
    
    def set_user_context(self, user_id: str):
        """Set the current user context for multi-tenant support"""
        self.current_user_id = user_id
        
        # Set Supabase user context for RLS
        if self.supabase:
            try:
                # This would be used in a real implementation with auth
                pass
            except:
                pass

# Custom CSS for medical theme
def load_custom_css():
    st.markdown("""
    <style>
    .main-header {
        font-size: 2.5rem;
        color: #1f77b4;
        text-align: center;
        margin-bottom: 2rem;
        font-weight: 700;
    }
    
    .metric-card {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 1.5rem;
        border-radius: 10px;
        color: white;
        margin: 0.5rem 0;
    }
    
    .citation-box {
        background-color: #f8f9fa;
        border-left: 4px solid #1f77b4;
        padding: 1rem;
        margin: 0.5rem 0;
        border-radius: 5px;
    }
    
    .confidence-high {
        color: #28a745;
        font-weight: bold;
    }
    
    .confidence-medium {
        color: #ffc107;
        font-weight: bold;
    }
    
    .confidence-low {
        color: #dc3545;
        font-weight: bold;
    }
    
    .entity-badge {
        display: inline-block;
        background-color: #e3f2fd;
        color: #2e7d32;
        padding: 0.25rem 0.5rem;
        margin: 0.25rem;
        border-radius: 15px;
        font-size: 0.875rem;
    }
    
    .document-item {
        background-color: #ffffff;
        border: 1px solid #e1e5e9;
        padding: 1rem;
        margin: 0.5rem 0;
        border-radius: 8px;
        transition: all 0.3s ease;
    }
    
    .document-item:hover {
        border-color: #1f77b4;
        box-shadow: 0 2px 8px rgba(31, 119, 180, 0.1);
    }
    
    .answer-container {
        background-color: #f8f9fa;
        padding: 1.5rem;
        border-radius: 10px;
        margin: 1rem 0;
        border: 1px solid #e9ecef;
    }
    
    .chat-message {
        padding: 1rem;
        margin: 0.5rem 0;
        border-radius: 10px;
        max-width: 80%;
    }
    
    .user-message {
        background-color: #1f77b4;
        color: white;
        margin-left: auto;
    }
    
    .assistant-message {
        background-color: #f1f3f4;
        color: #202124;
    }
    </style>
    """, unsafe_allow_html=True)

# Utility functions
def calculate_confidence_score(similarity_scores: List[float]) -> float:
    """Calculate overall confidence score from similarities"""
    if not similarity_scores:
        return 0.0
    
    avg_similarity = np.mean(similarity_scores)
    max_similarity = np.max(similarity_scores)
    
    # Weighted combination of average and max
    confidence = (avg_similarity * 0.7 + max_similarity * 0.3) * 100
    return round(confidence, 1)

def format_confidence_indicator(confidence: float) -> str:
    """Format confidence score with color indicator"""
    if confidence >= 80:
        return f'<span class="confidence-high">{confidence:.1f}%</span> 🟢'
    elif confidence >= 60:
        return f'<span class="confidence-medium">{confidence:.1f}%</span> 🟡'
    else:
        return f'<span class="confidence-low">{confidence:.1f}%</span> 🔴'
