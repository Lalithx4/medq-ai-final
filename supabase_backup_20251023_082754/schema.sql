--
-- PostgreSQL database dump
--

\restrict sBdVY2lcqRxqzMMdtDJNZynVNTULIxWE2I6iYYd0U80eJGegxWsdNxs9hxVUIw0

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: graphql; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA graphql;


--
-- Name: graphql_public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA graphql_public;


--
-- Name: pgbouncer; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA pgbouncer;


--
-- Name: vault; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA vault;


--
-- Name: pg_graphql; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_graphql WITH SCHEMA graphql;


--
-- Name: EXTENSION pg_graphql; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_graphql IS 'pg_graphql: GraphQL support';


--
-- Name: pg_stat_statements; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;


--
-- Name: EXTENSION pg_stat_statements; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_stat_statements IS 'track planning and execution statistics of all SQL statements executed';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: supabase_vault; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;


--
-- Name: EXTENSION supabase_vault; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION supabase_vault IS 'Supabase Vault Extension';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: DocumentType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."DocumentType" AS ENUM (
    'NOTE',
    'DOCUMENT',
    'DRAWING',
    'DESIGN',
    'STICKY_NOTES',
    'MIND_MAP',
    'RAG',
    'RESEARCH_PAPER',
    'FLIPBOOK',
    'PRESENTATION'
);


--
-- Name: UserRole; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."UserRole" AS ENUM (
    'ADMIN',
    'USER'
);


--
-- Name: get_auth(text); Type: FUNCTION; Schema: pgbouncer; Owner: -
--

CREATE FUNCTION pgbouncer.get_auth(p_usename text) RETURNS TABLE(username text, password text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $_$
begin
    raise debug 'PgBouncer auth request: %', p_usename;

    return query
    select 
        rolname::text, 
        case when rolvaliduntil < now() 
            then null 
            else rolpassword::text 
        end 
    from pg_authid 
    where rolname=$1 and rolcanlogin;
end;
$_$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Account; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Account" (
    id text NOT NULL,
    "userId" text NOT NULL,
    type text NOT NULL,
    provider text NOT NULL,
    "providerAccountId" text NOT NULL,
    refresh_token text,
    access_token text,
    expires_at integer,
    token_type text,
    scope text,
    id_token text,
    session_state text,
    refresh_token_expires_in integer
);


--
-- Name: BaseDocument; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."BaseDocument" (
    id text NOT NULL,
    title text NOT NULL,
    type public."DocumentType" NOT NULL,
    "userId" text NOT NULL,
    "thumbnailUrl" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "isPublic" boolean DEFAULT false NOT NULL,
    "documentType" text NOT NULL
);


--
-- Name: ChatConversation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ChatConversation" (
    id text NOT NULL,
    "userId" text NOT NULL,
    title text,
    context text NOT NULL,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ChatMessage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ChatMessage" (
    id text NOT NULL,
    "conversationId" text NOT NULL,
    "userId" text NOT NULL,
    role text NOT NULL,
    content text NOT NULL,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: CreditTransaction; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CreditTransaction" (
    id text NOT NULL,
    "userId" text NOT NULL,
    amount integer NOT NULL,
    type text NOT NULL,
    description text NOT NULL,
    operation text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: CustomTheme; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CustomTheme" (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    "userId" text NOT NULL,
    "logoUrl" text,
    "isPublic" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "themeData" jsonb NOT NULL
);


--
-- Name: DeepResearchReport; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."DeepResearchReport" (
    id text NOT NULL,
    "userId" text NOT NULL,
    topic text NOT NULL,
    status text NOT NULL,
    "filePath" text NOT NULL,
    markdown text NOT NULL,
    "pmidsUsed" jsonb,
    "wordCount" integer,
    "referenceCount" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Document; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Document" (
    id text NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    type text NOT NULL,
    sources text,
    "userId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: FavoriteDocument; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."FavoriteDocument" (
    id text NOT NULL,
    "documentId" text NOT NULL,
    "userId" text NOT NULL
);


--
-- Name: GeneratedImage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."GeneratedImage" (
    id text NOT NULL,
    url text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "userId" text NOT NULL,
    prompt text NOT NULL
);


--
-- Name: Payment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Payment" (
    id text NOT NULL,
    "userId" text NOT NULL,
    amount double precision NOT NULL,
    currency text NOT NULL,
    status text NOT NULL,
    plan text NOT NULL,
    "creditsAdded" integer NOT NULL,
    "stripePaymentId" text,
    "razorpayPaymentId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Presentation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Presentation" (
    id text NOT NULL,
    content jsonb NOT NULL,
    theme text DEFAULT 'default'::text NOT NULL,
    "imageSource" text DEFAULT 'ai'::text NOT NULL,
    prompt text,
    "presentationStyle" text,
    language text DEFAULT 'en-US'::text,
    outline text[],
    "searchResults" jsonb,
    "templateId" text,
    "customThemeId" text
);


--
-- Name: TokenUsage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TokenUsage" (
    id text NOT NULL,
    "userId" text NOT NULL,
    operation text NOT NULL,
    "operationId" text,
    "inputTokens" integer NOT NULL,
    "outputTokens" integer NOT NULL,
    "totalTokens" integer NOT NULL,
    "modelProvider" text NOT NULL,
    "modelId" text NOT NULL,
    "inputCost" double precision NOT NULL,
    "outputCost" double precision NOT NULL,
    "totalCost" double precision NOT NULL,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: User; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."User" (
    id text NOT NULL,
    name text,
    email text,
    password text,
    "emailVerified" timestamp(3) without time zone,
    image text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    headline character varying(100),
    bio text,
    interests text[],
    location text,
    website text,
    role public."UserRole" DEFAULT 'USER'::public."UserRole" NOT NULL,
    "hasAccess" boolean DEFAULT false NOT NULL,
    credits integer DEFAULT 100 NOT NULL,
    "stripeCustomerId" text,
    "subscriptionEnd" timestamp(3) without time zone,
    "subscriptionPlan" text DEFAULT 'free'::text NOT NULL,
    "totalInputTokens" integer DEFAULT 0 NOT NULL,
    "totalOutputTokens" integer DEFAULT 0 NOT NULL,
    "totalTokens" integer DEFAULT 0 NOT NULL,
    "totalTokenCost" double precision DEFAULT 0 NOT NULL,
    "subscriptionStart" timestamp(3) without time zone,
    "lastCreditRefresh" timestamp(3) without time zone
);


--
-- Name: Account Account_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Account"
    ADD CONSTRAINT "Account_pkey" PRIMARY KEY (id);


--
-- Name: BaseDocument BaseDocument_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BaseDocument"
    ADD CONSTRAINT "BaseDocument_pkey" PRIMARY KEY (id);


--
-- Name: ChatConversation ChatConversation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ChatConversation"
    ADD CONSTRAINT "ChatConversation_pkey" PRIMARY KEY (id);


--
-- Name: ChatMessage ChatMessage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ChatMessage"
    ADD CONSTRAINT "ChatMessage_pkey" PRIMARY KEY (id);


--
-- Name: CreditTransaction CreditTransaction_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CreditTransaction"
    ADD CONSTRAINT "CreditTransaction_pkey" PRIMARY KEY (id);


--
-- Name: CustomTheme CustomTheme_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CustomTheme"
    ADD CONSTRAINT "CustomTheme_pkey" PRIMARY KEY (id);


--
-- Name: DeepResearchReport DeepResearchReport_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DeepResearchReport"
    ADD CONSTRAINT "DeepResearchReport_pkey" PRIMARY KEY (id);


--
-- Name: Document Document_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Document"
    ADD CONSTRAINT "Document_pkey" PRIMARY KEY (id);


--
-- Name: FavoriteDocument FavoriteDocument_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FavoriteDocument"
    ADD CONSTRAINT "FavoriteDocument_pkey" PRIMARY KEY (id);


--
-- Name: GeneratedImage GeneratedImage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."GeneratedImage"
    ADD CONSTRAINT "GeneratedImage_pkey" PRIMARY KEY (id);


--
-- Name: Payment Payment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_pkey" PRIMARY KEY (id);


--
-- Name: Presentation Presentation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Presentation"
    ADD CONSTRAINT "Presentation_pkey" PRIMARY KEY (id);


--
-- Name: TokenUsage TokenUsage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TokenUsage"
    ADD CONSTRAINT "TokenUsage_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: Account_provider_providerAccountId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON public."Account" USING btree (provider, "providerAccountId");


--
-- Name: ChatConversation_context_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ChatConversation_context_idx" ON public."ChatConversation" USING btree (context);


--
-- Name: ChatConversation_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ChatConversation_userId_idx" ON public."ChatConversation" USING btree ("userId");


--
-- Name: ChatMessage_conversationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ChatMessage_conversationId_idx" ON public."ChatMessage" USING btree ("conversationId");


--
-- Name: ChatMessage_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ChatMessage_userId_idx" ON public."ChatMessage" USING btree ("userId");


--
-- Name: CreditTransaction_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CreditTransaction_createdAt_idx" ON public."CreditTransaction" USING btree ("createdAt");


--
-- Name: CreditTransaction_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CreditTransaction_type_idx" ON public."CreditTransaction" USING btree (type);


--
-- Name: CreditTransaction_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CreditTransaction_userId_idx" ON public."CreditTransaction" USING btree ("userId");


--
-- Name: CustomTheme_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CustomTheme_userId_idx" ON public."CustomTheme" USING btree ("userId");


--
-- Name: DeepResearchReport_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DeepResearchReport_status_idx" ON public."DeepResearchReport" USING btree (status);


--
-- Name: DeepResearchReport_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DeepResearchReport_userId_idx" ON public."DeepResearchReport" USING btree ("userId");


--
-- Name: Document_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Document_type_idx" ON public."Document" USING btree (type);


--
-- Name: Document_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Document_userId_idx" ON public."Document" USING btree ("userId");


--
-- Name: Payment_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Payment_createdAt_idx" ON public."Payment" USING btree ("createdAt");


--
-- Name: Payment_razorpayPaymentId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Payment_razorpayPaymentId_key" ON public."Payment" USING btree ("razorpayPaymentId");


--
-- Name: Payment_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Payment_status_idx" ON public."Payment" USING btree (status);


--
-- Name: Payment_stripePaymentId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Payment_stripePaymentId_key" ON public."Payment" USING btree ("stripePaymentId");


--
-- Name: Payment_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Payment_userId_idx" ON public."Payment" USING btree ("userId");


--
-- Name: TokenUsage_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TokenUsage_createdAt_idx" ON public."TokenUsage" USING btree ("createdAt");


--
-- Name: TokenUsage_modelProvider_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TokenUsage_modelProvider_idx" ON public."TokenUsage" USING btree ("modelProvider");


--
-- Name: TokenUsage_operation_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TokenUsage_operation_idx" ON public."TokenUsage" USING btree (operation);


--
-- Name: TokenUsage_userId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TokenUsage_userId_createdAt_idx" ON public."TokenUsage" USING btree ("userId", "createdAt");


--
-- Name: TokenUsage_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TokenUsage_userId_idx" ON public."TokenUsage" USING btree ("userId");


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: User_lastCreditRefresh_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "User_lastCreditRefresh_idx" ON public."User" USING btree ("lastCreditRefresh");


--
-- Name: User_stripeCustomerId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON public."User" USING btree ("stripeCustomerId");


--
-- Name: User_subscriptionEnd_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "User_subscriptionEnd_idx" ON public."User" USING btree ("subscriptionEnd");


--
-- Name: User_subscriptionPlan_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "User_subscriptionPlan_idx" ON public."User" USING btree ("subscriptionPlan");


--
-- Name: Account Account_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Account"
    ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: BaseDocument BaseDocument_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BaseDocument"
    ADD CONSTRAINT "BaseDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ChatConversation ChatConversation_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ChatConversation"
    ADD CONSTRAINT "ChatConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ChatMessage ChatMessage_conversationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ChatMessage"
    ADD CONSTRAINT "ChatMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES public."ChatConversation"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ChatMessage ChatMessage_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ChatMessage"
    ADD CONSTRAINT "ChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CreditTransaction CreditTransaction_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CreditTransaction"
    ADD CONSTRAINT "CreditTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CustomTheme CustomTheme_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CustomTheme"
    ADD CONSTRAINT "CustomTheme_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DeepResearchReport DeepResearchReport_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DeepResearchReport"
    ADD CONSTRAINT "DeepResearchReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Document Document_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Document"
    ADD CONSTRAINT "Document_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: FavoriteDocument FavoriteDocument_documentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FavoriteDocument"
    ADD CONSTRAINT "FavoriteDocument_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES public."BaseDocument"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: FavoriteDocument FavoriteDocument_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FavoriteDocument"
    ADD CONSTRAINT "FavoriteDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: GeneratedImage GeneratedImage_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."GeneratedImage"
    ADD CONSTRAINT "GeneratedImage_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Payment Payment_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Presentation Presentation_customThemeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Presentation"
    ADD CONSTRAINT "Presentation_customThemeId_fkey" FOREIGN KEY ("customThemeId") REFERENCES public."CustomTheme"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Presentation Presentation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Presentation"
    ADD CONSTRAINT "Presentation_id_fkey" FOREIGN KEY (id) REFERENCES public."BaseDocument"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TokenUsage TokenUsage_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TokenUsage"
    ADD CONSTRAINT "TokenUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: supabase_realtime; Type: PUBLICATION; Schema: -; Owner: -
--

CREATE PUBLICATION supabase_realtime WITH (publish = 'insert, update, delete, truncate');


--
-- Name: issue_graphql_placeholder; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_graphql_placeholder ON sql_drop
         WHEN TAG IN ('DROP EXTENSION')
   EXECUTE FUNCTION extensions.set_graphql_placeholder();


--
-- Name: issue_pg_cron_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_pg_cron_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_cron_access();


--
-- Name: issue_pg_graphql_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_pg_graphql_access ON ddl_command_end
         WHEN TAG IN ('CREATE FUNCTION')
   EXECUTE FUNCTION extensions.grant_pg_graphql_access();


--
-- Name: issue_pg_net_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_pg_net_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_net_access();


--
-- Name: pgrst_ddl_watch; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER pgrst_ddl_watch ON ddl_command_end
   EXECUTE FUNCTION extensions.pgrst_ddl_watch();


--
-- Name: pgrst_drop_watch; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER pgrst_drop_watch ON sql_drop
   EXECUTE FUNCTION extensions.pgrst_drop_watch();


--
-- PostgreSQL database dump complete
--

\unrestrict sBdVY2lcqRxqzMMdtDJNZynVNTULIxWE2I6iYYd0U80eJGegxWsdNxs9hxVUIw0

