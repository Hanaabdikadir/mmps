--
-- PostgreSQL database dump
--

\restrict EG2l6MtDPtEpR9ErGfbOavubcsg0f0zw0D3AhmaPocbST6dJaELz93IIld0ibb3

-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

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
-- Name: AccountStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."AccountStatus" AS ENUM (
    'ACTIVE',
    'SUSPENDED',
    'INACTIVE'
);


ALTER TYPE public."AccountStatus" OWNER TO postgres;

--
-- Name: AnimalType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."AnimalType" AS ENUM (
    'CAMEL',
    'CATTLE',
    'GOAT',
    'SHEEP',
    'POULTRY',
    'HAL',
    'AWAR',
    'QURBAC'
);


ALTER TYPE public."AnimalType" OWNER TO postgres;

--
-- Name: ApprovalAction; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ApprovalAction" AS ENUM (
    'APPROVE',
    'REJECT'
);


ALTER TYPE public."ApprovalAction" OWNER TO postgres;

--
-- Name: CompanyType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."CompanyType" AS ENUM (
    'WATER_SUPPLY',
    'ELECTRICITY',
    'OTHER'
);


ALTER TYPE public."CompanyType" OWNER TO postgres;

--
-- Name: ElectricityType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ElectricityType" AS ENUM (
    'RESIDENTIAL',
    'COMMERCIAL',
    'UNIT_KWH',
    'SERVICE_PROVIDER'
);


ALTER TYPE public."ElectricityType" OWNER TO postgres;

--
-- Name: MarketType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."MarketType" AS ENUM (
    'WATER',
    'ELECTRICITY',
    'LIVESTOCK',
    'GENERAL'
);


ALTER TYPE public."MarketType" OWNER TO postgres;

--
-- Name: NotificationType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."NotificationType" AS ENUM (
    'PRICE_SUBMITTED',
    'PRICE_APPROVED',
    'PRICE_REJECTED',
    'SUBSCRIPTION_ACTIVATED',
    'SUBSCRIPTION_EXPIRING',
    'SUBSCRIPTION_EXPIRED',
    'USER_CREATED',
    'SYSTEM_ANNOUNCEMENT',
    'GENERAL'
);


ALTER TYPE public."NotificationType" OWNER TO postgres;

--
-- Name: PriceStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."PriceStatus" AS ENUM (
    'DRAFT',
    'PENDING',
    'APPROVED',
    'REJECTED'
);


ALTER TYPE public."PriceStatus" OWNER TO postgres;

--
-- Name: ReportType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ReportType" AS ENUM (
    'DAILY',
    'WEEKLY',
    'MONTHLY',
    'QUARTERLY',
    'ANNUAL'
);


ALTER TYPE public."ReportType" OWNER TO postgres;

--
-- Name: Role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."Role" AS ENUM (
    'PUBLIC',
    'REGISTERED',
    'SUPER_ADMIN',
    'COMPANY_ADMIN',
    'LIVESTOCK_BROKER_USER'
);


ALTER TYPE public."Role" OWNER TO postgres;

--
-- Name: SubscriptionStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."SubscriptionStatus" AS ENUM (
    'ACTIVE',
    'EXPIRING_SOON',
    'EXPIRED',
    'CANCELLED'
);


ALTER TYPE public."SubscriptionStatus" OWNER TO postgres;

--
-- Name: UserStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."UserStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);


ALTER TYPE public."UserStatus" OWNER TO postgres;

--
-- Name: WaterType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."WaterType" AS ENUM (
    'TANKER',
    'HOUSEHOLD',
    'COMMERCIAL',
    'SERVICE_PROVIDER'
);


ALTER TYPE public."WaterType" OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _CompanySections; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."_CompanySections" (
    "A" integer NOT NULL,
    "B" integer NOT NULL
);


ALTER TABLE public."_CompanySections" OWNER TO postgres;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO postgres;

--
-- Name: admin_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admin_sessions (
    id text NOT NULL,
    user_id integer NOT NULL,
    role public."Role" NOT NULL,
    user_agent_hash text NOT NULL,
    last_seen_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at timestamp(3) without time zone NOT NULL,
    revoked_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.admin_sessions OWNER TO postgres;

--
-- Name: companies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.companies (
    id integer NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    type public."CompanyType" DEFAULT 'OTHER'::public."CompanyType" NOT NULL,
    email text,
    phone text,
    location text,
    district text,
    address text,
    registration_number text,
    logo_file_name text,
    description text,
    status public."AccountStatus" DEFAULT 'ACTIVE'::public."AccountStatus" NOT NULL,
    market_id integer,
    deleted_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    profile_data jsonb
);


ALTER TABLE public.companies OWNER TO postgres;

--
-- Name: companies_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.companies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.companies_id_seq OWNER TO postgres;

--
-- Name: companies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.companies_id_seq OWNED BY public.companies.id;


--
-- Name: company_documents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.company_documents (
    id integer NOT NULL,
    company_id integer NOT NULL,
    file_name text NOT NULL,
    original_name text NOT NULL,
    mime_type text NOT NULL,
    size_bytes integer NOT NULL,
    uploaded_by integer,
    deleted_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.company_documents OWNER TO postgres;

--
-- Name: company_documents_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.company_documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.company_documents_id_seq OWNER TO postgres;

--
-- Name: company_documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.company_documents_id_seq OWNED BY public.company_documents.id;


--
-- Name: electricity_prices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.electricity_prices (
    id integer NOT NULL,
    provider_name text NOT NULL,
    service_type public."ElectricityType" NOT NULL,
    location text NOT NULL,
    price_per_kwh numeric(12,2) NOT NULL,
    date_recorded timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_by integer NOT NULL,
    approved_at timestamp(3) without time zone,
    approved_by integer,
    rejected_at timestamp(3) without time zone,
    rejected_by integer,
    rejection_reason text,
    status public."PriceStatus" DEFAULT 'PENDING'::public."PriceStatus" NOT NULL
);


ALTER TABLE public.electricity_prices OWNER TO postgres;

--
-- Name: electricity_prices_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.electricity_prices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.electricity_prices_id_seq OWNER TO postgres;

--
-- Name: electricity_prices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.electricity_prices_id_seq OWNED BY public.electricity_prices.id;


--
-- Name: favorites; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.favorites (
    id integer NOT NULL,
    user_id integer NOT NULL,
    sector text NOT NULL,
    category text NOT NULL
);


ALTER TABLE public.favorites OWNER TO postgres;

--
-- Name: favorites_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.favorites_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.favorites_id_seq OWNER TO postgres;

--
-- Name: favorites_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.favorites_id_seq OWNED BY public.favorites.id;


--
-- Name: livestock_animal_types; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.livestock_animal_types (
    id integer NOT NULL,
    category_id integer NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    name_somali text,
    description text,
    unit text DEFAULT 'head'::text,
    legacy_animal_type public."AnimalType" NOT NULL,
    status public."AccountStatus" DEFAULT 'ACTIVE'::public."AccountStatus" NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    image_url text
);


ALTER TABLE public.livestock_animal_types OWNER TO postgres;

--
-- Name: livestock_animal_types_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.livestock_animal_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.livestock_animal_types_id_seq OWNER TO postgres;

--
-- Name: livestock_animal_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.livestock_animal_types_id_seq OWNED BY public.livestock_animal_types.id;


--
-- Name: livestock_broker_animal_types; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.livestock_broker_animal_types (
    broker_id integer NOT NULL,
    animal_type_id integer NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.livestock_broker_animal_types OWNER TO postgres;

--
-- Name: livestock_broker_categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.livestock_broker_categories (
    broker_id integer NOT NULL,
    category_id integer NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.livestock_broker_categories OWNER TO postgres;

--
-- Name: livestock_broker_markets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.livestock_broker_markets (
    broker_id integer NOT NULL,
    market_id integer NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.livestock_broker_markets OWNER TO postgres;

--
-- Name: livestock_brokers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.livestock_brokers (
    id integer NOT NULL,
    name text NOT NULL,
    email text,
    phone text,
    location text,
    profile_picture text,
    description text,
    livestock_focus text,
    status public."AccountStatus" DEFAULT 'ACTIVE'::public."AccountStatus" NOT NULL,
    market_id integer,
    deleted_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    hero_title text,
    broker_code text,
    approval_status public."UserStatus" DEFAULT 'APPROVED'::public."UserStatus" NOT NULL
);


ALTER TABLE public.livestock_brokers OWNER TO postgres;

--
-- Name: livestock_brokers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.livestock_brokers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.livestock_brokers_id_seq OWNER TO postgres;

--
-- Name: livestock_brokers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.livestock_brokers_id_seq OWNED BY public.livestock_brokers.id;


--
-- Name: livestock_categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.livestock_categories (
    id integer NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    name_somali text,
    description text,
    species public."AnimalType" NOT NULL,
    status public."AccountStatus" DEFAULT 'ACTIVE'::public."AccountStatus" NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    image_url text
);


ALTER TABLE public.livestock_categories OWNER TO postgres;

--
-- Name: livestock_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.livestock_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.livestock_categories_id_seq OWNER TO postgres;

--
-- Name: livestock_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.livestock_categories_id_seq OWNED BY public.livestock_categories.id;


--
-- Name: livestock_market_categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.livestock_market_categories (
    market_id integer NOT NULL,
    category_id integer NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.livestock_market_categories OWNER TO postgres;

--
-- Name: livestock_prices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.livestock_prices (
    id integer NOT NULL,
    animal_type public."AnimalType" NOT NULL,
    market_location text NOT NULL,
    price numeric(12,2) NOT NULL,
    date_recorded timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_by integer NOT NULL,
    approved_at timestamp(3) without time zone,
    approved_by integer,
    rejected_at timestamp(3) without time zone,
    rejected_by integer,
    rejection_reason text,
    status public."PriceStatus" DEFAULT 'PENDING'::public."PriceStatus" NOT NULL,
    broker_id integer,
    category text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    deleted_at timestamp(3) without time zone,
    description text,
    market_id integer,
    updated_at timestamp(3) without time zone NOT NULL,
    livestock_category_id integer,
    livestock_type_id integer,
    unit text,
    age_class text,
    origin_place text
);


ALTER TABLE public.livestock_prices OWNER TO postgres;

--
-- Name: livestock_prices_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.livestock_prices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.livestock_prices_id_seq OWNER TO postgres;

--
-- Name: livestock_prices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.livestock_prices_id_seq OWNED BY public.livestock_prices.id;


--
-- Name: market_prices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.market_prices (
    id integer NOT NULL,
    company_id integer,
    market_id integer,
    section_id integer,
    product_service text NOT NULL,
    price numeric(12,2) NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    unit text,
    kilowatt numeric(12,4),
    meter_cubic numeric(12,4),
    effective_date timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    description text,
    status public."PriceStatus" DEFAULT 'PENDING'::public."PriceStatus" NOT NULL,
    rejection_reason text,
    updated_by integer NOT NULL,
    approved_by integer,
    approved_at timestamp(3) without time zone,
    rejected_by integer,
    rejected_at timestamp(3) without time zone,
    deleted_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.market_prices OWNER TO postgres;

--
-- Name: market_prices_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.market_prices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.market_prices_id_seq OWNER TO postgres;

--
-- Name: market_prices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.market_prices_id_seq OWNED BY public.market_prices.id;


--
-- Name: market_sections; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.market_sections (
    id integer NOT NULL,
    market_id integer NOT NULL,
    name text NOT NULL,
    description text,
    status public."AccountStatus" DEFAULT 'ACTIVE'::public."AccountStatus" NOT NULL,
    deleted_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.market_sections OWNER TO postgres;

--
-- Name: market_sections_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.market_sections_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.market_sections_id_seq OWNER TO postgres;

--
-- Name: market_sections_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.market_sections_id_seq OWNED BY public.market_sections.id;


--
-- Name: markets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.markets (
    id integer NOT NULL,
    name text NOT NULL,
    location text,
    market_type public."MarketType" DEFAULT 'GENERAL'::public."MarketType" NOT NULL,
    description text,
    status public."AccountStatus" DEFAULT 'ACTIVE'::public."AccountStatus" NOT NULL,
    deleted_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    code text,
    logo_file_name text
);


ALTER TABLE public.markets OWNER TO postgres;

--
-- Name: markets_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.markets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.markets_id_seq OWNER TO postgres;

--
-- Name: markets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.markets_id_seq OWNED BY public.markets.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    user_id integer NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    sector text DEFAULT 'system'::text NOT NULL,
    read boolean DEFAULT false NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    sender_id integer,
    type public."NotificationType" DEFAULT 'GENERAL'::public."NotificationType" NOT NULL
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notifications_id_seq OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.password_reset_tokens (
    id text NOT NULL,
    user_id integer NOT NULL,
    token_hash text NOT NULL,
    expires_at timestamp(3) without time zone NOT NULL,
    used_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    code_hash text,
    attempts integer DEFAULT 0 NOT NULL,
    last_sent_at timestamp(3) without time zone
);


ALTER TABLE public.password_reset_tokens OWNER TO postgres;

--
-- Name: permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.permissions (
    id integer NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    module text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.permissions OWNER TO postgres;

--
-- Name: permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.permissions_id_seq OWNER TO postgres;

--
-- Name: permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.permissions_id_seq OWNED BY public.permissions.id;


--
-- Name: price_approvals; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.price_approvals (
    id integer NOT NULL,
    action public."ApprovalAction" NOT NULL,
    comment text,
    reviewed_by integer NOT NULL,
    market_price_id integer,
    livestock_price_id integer,
    water_price_id integer,
    electricity_price_id integer,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.price_approvals OWNER TO postgres;

--
-- Name: price_approvals_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.price_approvals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.price_approvals_id_seq OWNER TO postgres;

--
-- Name: price_approvals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.price_approvals_id_seq OWNED BY public.price_approvals.id;


--
-- Name: registration_messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.registration_messages (
    id integer NOT NULL,
    thread_user_id integer NOT NULL,
    sender_id integer NOT NULL,
    body text NOT NULL,
    read_at timestamp(3) with time zone,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.registration_messages OWNER TO postgres;

--
-- Name: registration_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.registration_messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.registration_messages_id_seq OWNER TO postgres;

--
-- Name: registration_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.registration_messages_id_seq OWNED BY public.registration_messages.id;


--
-- Name: registration_rejection_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.registration_rejection_history (
    id integer NOT NULL,
    user_id integer NOT NULL,
    previous_reason text,
    new_reason text NOT NULL,
    changed_by_id integer NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.registration_rejection_history OWNER TO postgres;

--
-- Name: registration_rejection_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.registration_rejection_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.registration_rejection_history_id_seq OWNER TO postgres;

--
-- Name: registration_rejection_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.registration_rejection_history_id_seq OWNED BY public.registration_rejection_history.id;


--
-- Name: registration_timeline_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.registration_timeline_events (
    id integer NOT NULL,
    user_id integer NOT NULL,
    event_type text NOT NULL,
    title text NOT NULL,
    detail text,
    status_label text,
    actor_id integer,
    actor_label text,
    visible_to_applicant boolean DEFAULT true NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.registration_timeline_events OWNER TO postgres;

--
-- Name: registration_timeline_events_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.registration_timeline_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.registration_timeline_events_id_seq OWNER TO postgres;

--
-- Name: registration_timeline_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.registration_timeline_events_id_seq OWNED BY public.registration_timeline_events.id;


--
-- Name: reports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reports (
    id integer NOT NULL,
    report_type public."ReportType" NOT NULL,
    generated_date timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    generated_by integer NOT NULL,
    sector text NOT NULL,
    summary text
);


ALTER TABLE public.reports OWNER TO postgres;

--
-- Name: reports_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.reports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.reports_id_seq OWNER TO postgres;

--
-- Name: reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.reports_id_seq OWNED BY public.reports.id;


--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.role_permissions (
    id integer NOT NULL,
    role public."Role" NOT NULL,
    permission_id integer NOT NULL
);


ALTER TABLE public.role_permissions OWNER TO postgres;

--
-- Name: role_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.role_permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.role_permissions_id_seq OWNER TO postgres;

--
-- Name: role_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.role_permissions_id_seq OWNED BY public.role_permissions.id;


--
-- Name: subscription_payment_proofs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.subscription_payment_proofs (
    id integer NOT NULL,
    subscription_id integer NOT NULL,
    receipt_file text NOT NULL,
    status text DEFAULT 'PENDING'::text NOT NULL,
    submitted_by integer,
    reviewed_at timestamp(3) with time zone,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.subscription_payment_proofs OWNER TO postgres;

--
-- Name: subscription_payment_proofs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.subscription_payment_proofs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.subscription_payment_proofs_id_seq OWNER TO postgres;

--
-- Name: subscription_payment_proofs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.subscription_payment_proofs_id_seq OWNED BY public.subscription_payment_proofs.id;


--
-- Name: subscription_plans; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.subscription_plans (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    price numeric(12,2) NOT NULL,
    duration_days integer NOT NULL,
    account_type text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    max_markets integer,
    max_livestock_types integer
);


ALTER TABLE public.subscription_plans OWNER TO postgres;

--
-- Name: subscription_plans_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.subscription_plans_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.subscription_plans_id_seq OWNER TO postgres;

--
-- Name: subscription_plans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.subscription_plans_id_seq OWNED BY public.subscription_plans.id;


--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.subscriptions (
    id integer NOT NULL,
    plan_id integer NOT NULL,
    company_id integer,
    broker_id integer,
    start_date timestamp(3) without time zone NOT NULL,
    expiry_date timestamp(3) without time zone NOT NULL,
    status public."SubscriptionStatus" DEFAULT 'ACTIVE'::public."SubscriptionStatus" NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    ads_remaining integer,
    paid_months integer,
    paid_amount numeric(12,2)
);


ALTER TABLE public.subscriptions OWNER TO postgres;

--
-- Name: subscriptions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.subscriptions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.subscriptions_id_seq OWNER TO postgres;

--
-- Name: subscriptions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.subscriptions_id_seq OWNED BY public.subscriptions.id;


--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.system_settings (
    id integer NOT NULL,
    key text NOT NULL,
    value text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.system_settings OWNER TO postgres;

--
-- Name: system_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.system_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.system_settings_id_seq OWNER TO postgres;

--
-- Name: system_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.system_settings_id_seq OWNED BY public.system_settings.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    full_name text NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    phone text,
    company_name text,
    company_sector text,
    company_location text,
    company_type text,
    company_established_date text,
    company_country text,
    company_district text,
    company_address text,
    company_logo_file_name text,
    company_registration_number text,
    company_email text,
    company_slug text,
    contact_role text,
    document_file_name text,
    registration_documents text,
    role public."Role" DEFAULT 'REGISTERED'::public."Role" NOT NULL,
    status public."UserStatus" DEFAULT 'PENDING'::public."UserStatus" NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    account_status public."AccountStatus" DEFAULT 'ACTIVE'::public."AccountStatus" NOT NULL,
    broker_id integer,
    company_id integer,
    deleted_at timestamp(3) without time zone,
    profile_picture text,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    registration_password_enc text,
    documents_reviewed_at timestamp(3) with time zone,
    rejection_reason text,
    rejected_at timestamp(3) with time zone,
    rejected_by_id integer,
    registration_document_reviews text,
    market_id integer
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: verification_codes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.verification_codes (
    id integer NOT NULL,
    user_id integer NOT NULL,
    code text NOT NULL,
    verified boolean DEFAULT false NOT NULL,
    verified_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at timestamp(3) without time zone NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    locked_until timestamp(3) without time zone
);


ALTER TABLE public.verification_codes OWNER TO postgres;

--
-- Name: verification_codes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.verification_codes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.verification_codes_id_seq OWNER TO postgres;

--
-- Name: verification_codes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.verification_codes_id_seq OWNED BY public.verification_codes.id;


--
-- Name: water_prices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.water_prices (
    id integer NOT NULL,
    provider_name text NOT NULL,
    water_type public."WaterType" NOT NULL,
    location text NOT NULL,
    price_per_unit numeric(12,2) NOT NULL,
    date_recorded timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_by integer NOT NULL,
    approved_at timestamp(3) without time zone,
    approved_by integer,
    rejected_at timestamp(3) without time zone,
    rejected_by integer,
    rejection_reason text,
    status public."PriceStatus" DEFAULT 'PENDING'::public."PriceStatus" NOT NULL
);


ALTER TABLE public.water_prices OWNER TO postgres;

--
-- Name: water_prices_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.water_prices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.water_prices_id_seq OWNER TO postgres;

--
-- Name: water_prices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.water_prices_id_seq OWNED BY public.water_prices.id;


--
-- Name: companies id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.companies ALTER COLUMN id SET DEFAULT nextval('public.companies_id_seq'::regclass);


--
-- Name: company_documents id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_documents ALTER COLUMN id SET DEFAULT nextval('public.company_documents_id_seq'::regclass);


--
-- Name: electricity_prices id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.electricity_prices ALTER COLUMN id SET DEFAULT nextval('public.electricity_prices_id_seq'::regclass);


--
-- Name: favorites id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.favorites ALTER COLUMN id SET DEFAULT nextval('public.favorites_id_seq'::regclass);


--
-- Name: livestock_animal_types id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.livestock_animal_types ALTER COLUMN id SET DEFAULT nextval('public.livestock_animal_types_id_seq'::regclass);


--
-- Name: livestock_brokers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.livestock_brokers ALTER COLUMN id SET DEFAULT nextval('public.livestock_brokers_id_seq'::regclass);


--
-- Name: livestock_categories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.livestock_categories ALTER COLUMN id SET DEFAULT nextval('public.livestock_categories_id_seq'::regclass);


--
-- Name: livestock_prices id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.livestock_prices ALTER COLUMN id SET DEFAULT nextval('public.livestock_prices_id_seq'::regclass);


--
-- Name: market_prices id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.market_prices ALTER COLUMN id SET DEFAULT nextval('public.market_prices_id_seq'::regclass);


--
-- Name: market_sections id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.market_sections ALTER COLUMN id SET DEFAULT nextval('public.market_sections_id_seq'::regclass);


--
-- Name: markets id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.markets ALTER COLUMN id SET DEFAULT nextval('public.markets_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: permissions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions ALTER COLUMN id SET DEFAULT nextval('public.permissions_id_seq'::regclass);


--
-- Name: price_approvals id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.price_approvals ALTER COLUMN id SET DEFAULT nextval('public.price_approvals_id_seq'::regclass);


--
-- Name: registration_messages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.registration_messages ALTER COLUMN id SET DEFAULT nextval('public.registration_messages_id_seq'::regclass);


--
-- Name: registration_rejection_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.registration_rejection_history ALTER COLUMN id SET DEFAULT nextval('public.registration_rejection_history_id_seq'::regclass);


--
-- Name: registration_timeline_events id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.registration_timeline_events ALTER COLUMN id SET DEFAULT nextval('public.registration_timeline_events_id_seq'::regclass);


--
-- Name: reports id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reports ALTER COLUMN id SET DEFAULT nextval('public.reports_id_seq'::regclass);


--
-- Name: role_permissions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions ALTER COLUMN id SET DEFAULT nextval('public.role_permissions_id_seq'::regclass);


--
-- Name: subscription_payment_proofs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscription_payment_proofs ALTER COLUMN id SET DEFAULT nextval('public.subscription_payment_proofs_id_seq'::regclass);


--
-- Name: subscription_plans id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscription_plans ALTER COLUMN id SET DEFAULT nextval('public.subscription_plans_id_seq'::regclass);


--
-- Name: subscriptions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscriptions ALTER COLUMN id SET DEFAULT nextval('public.subscriptions_id_seq'::regclass);


--
-- Name: system_settings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_settings ALTER COLUMN id SET DEFAULT nextval('public.system_settings_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: verification_codes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.verification_codes ALTER COLUMN id SET DEFAULT nextval('public.verification_codes_id_seq'::regclass);


--
-- Name: water_prices id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.water_prices ALTER COLUMN id SET DEFAULT nextval('public.water_prices_id_seq'::regclass);


--
-- Data for Name: _CompanySections; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."_CompanySections" ("A", "B") FROM stdin;
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
80dcda44-c657-45de-8c81-9080d883a100	b135571bfd8068e8568aceba44877f417a23b0cb9c318f5fae3d4eec2df7ae9a	2026-08-10 15:34:53.903277+03	20260810153000_baseline		\N	2026-08-10 15:34:53.903277+03	0
85c1d13b-d16e-4bcb-a39c-6a71b89348db	44ba64e045ad1feb0ff5b9e4f14835e3baac6911640ad6aa1dfef112b9a5d48b	2026-08-10 15:37:48.059294+03	20260810160000_production_persistence	\N	\N	2026-08-10 15:37:47.973768+03	1
72880f09-313d-4542-af53-98694615f6c7	b2fc525e27f9418a71c613d0c0def7ae6a55b0e40e91db201bcc234c9085238a	2026-08-12 01:13:57.255077+03	20260811220000_registration_messages	\N	\N	2026-08-12 01:13:57.055782+03	1
ad495d15-3fb3-43dd-8a21-9e0213d3ad1f	edd77fa742a6709fbb85575e2b2d860383dd3474efb692d83c0ee6b61fb5eaa2	2026-08-12 02:47:48.811076+03	20260812024500_registration_password_enc	\N	\N	2026-08-12 02:47:48.79754+03	1
c82f4489-df38-43bc-88c3-930c0466018b	7374c3a95fb9ca3fa1d355cd39a560fd1661c5c068ee4f4d7389e8e00ff587fd	2026-08-12 11:07:01.411596+03	20260812120000_livestock_broker_hero_title	\N	\N	2026-08-12 11:07:01.367033+03	1
b1e846f0-cb48-4654-8241-3ed7411b4486	4dbc15ff6fe9942d66ea2f586add5803b44c0ccf566e05cb504341d78a4c58b9	2026-08-16 11:43:49.681985+03	20260816120000_documents_reviewed_at	\N	\N	2026-08-16 11:43:49.654333+03	1
ab50f296-61af-41e0-b329-e5086bfe6c70	b7695039095946c6c75df6bfff8b027f2e6aeb1172175557b0a2720f7f5261da	2026-08-16 12:12:27.874265+03	20260816123000_registration_rejection_tracking	\N	\N	2026-08-16 12:12:27.012582+03	1
7cb6a8bb-1980-4a22-aaca-8d29ff253365	c71bbf9bcbc6cbc6812b42cf53dbf22b18f1a6109d0801e0416498d803020ac0	2026-08-16 12:26:42.449691+03	20260816130000_registration_document_reviews	\N	\N	2026-08-16 12:26:42.404232+03	1
c5076512-dbb1-4157-ba06-592c69fe375a	527122ce71efe270fda7cb1d5a8fd32e2e836f4fd3e9ad6fa6639b1419b042bf	2026-08-19 11:13:48.087679+03	20260819120000_password_reset_otp	\N	\N	2026-08-19 11:13:47.836476+03	1
0c12408a-7369-48e8-a2ba-6f909ad832a0	60ce48babed3538e52be4ab444b589552782ad39eb47c763c0347585b2694fd4	2026-08-19 12:18:21.980252+03	20260819140000_user_supabase_auth_id	\N	\N	2026-08-19 12:18:21.855933+03	1
d4e66b8e-b866-42a8-8e27-70f58b7098d3	1a9c9f5cdd7adf5911b6c0341e145d8cc18913defe0902cea2b4394a1d7b37d6	\N	20260819150000_user_registration_market	A migration failed to apply. New migrations cannot be applied before the error is recovered from. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve\n\nMigration name: 20260819150000_user_registration_market\n\nDatabase error code: 42701\n\nDatabase error:\nERROR: column "market_id" of relation "users" already exists\n\nDbError { severity: "ERROR", parsed_severity: Some(Error), code: SqlState(E42701), message: "column \\"market_id\\" of relation \\"users\\" already exists", detail: None, hint: None, position: None, where_: None, schema: None, table: None, column: None, datatype: None, constraint: None, file: Some("tablecmds.c"), line: Some(7689), routine: Some("check_for_column_name_collision") }\n\n   0: sql_schema_connector::apply_migration::apply_script\n           with migration_name="20260819150000_user_registration_market"\n             at schema-engine\\connectors\\sql-schema-connector\\src\\apply_migration.rs:106\n   1: schema_core::commands::apply_migrations::Applying migration\n           with migration_name="20260819150000_user_registration_market"\n             at schema-engine\\core\\src\\commands\\apply_migrations.rs:91\n   2: schema_core::state::ApplyMigrations\n             at schema-engine\\core\\src\\state.rs:226	2026-08-28 08:46:21.968699+03	2026-08-24 15:26:10.572404+03	0
130d15b2-e3d8-4228-851d-a254b4b3b379	1a9c9f5cdd7adf5911b6c0341e145d8cc18913defe0902cea2b4394a1d7b37d6	2026-08-28 08:46:21.98252+03	20260819150000_user_registration_market		\N	2026-08-28 08:46:21.98252+03	0
ebfa5dae-24a9-4ccc-b251-08fe18b7a05d	c5a8564dcccd228cfe9a68464a8cce7593f36fe0e134a4167bfa5d44f3f2c6e9	2026-08-28 08:46:56.684961+03	20260824120000_timeline_timestamptz	\N	\N	2026-08-28 08:46:56.401572+03	1
bd58e246-8fe6-4701-a112-0414cf334b08	e3e1b9d30934fe5ce2d36241f7e73e3b043232176d36801b5c88ed2a08aac1b2	2026-08-28 08:46:56.928019+03	20260824153000_registration_timestamptz	\N	\N	2026-08-28 08:46:56.686572+03	1
f01b44c0-8208-410d-bb91-0eeb8dbc95ab	52998ef81bf2588e0bdac65c377bf7c99df6d8c1a7a66381426ebbb0016bbf09	2026-08-28 08:46:57.143952+03	20260828120000_livestock_sector_catalog	\N	\N	2026-08-28 08:46:56.930105+03	1
63786461-5de9-474d-aff4-7ffe515b5cbf	91572d418332a6171b1a995c86fd99cca0179030a58b58bd6b94ed760ba3429d	2026-09-23 22:23:02.754285+03	20260923220000_subscription_plan_livestock_scope	\N	\N	2026-09-23 22:23:02.727742+03	1
7e4656ad-17ef-4c2c-a1a0-ba8f5ccf062c	25aaaadb0be32e6f032c5a2ad51d95f7d141d8cc46711a69c9d4d1f965c3fb1f	2026-09-07 02:01:38.847022+03	20260830180000_livestock_category_image	\N	\N	2026-09-07 02:01:38.833749+03	1
80f3b945-d85c-4161-99d4-b313e8b99550	917acdff1422684292a109383ca7435a08f36a717f35cf084c8cad9cd893b2df	2026-09-07 02:01:38.851392+03	20260902040000_livestock_type_image	\N	\N	2026-09-07 02:01:38.848098+03	1
ab825caf-cc83-41d4-bf3f-1c311d97c848	73613e340cfe10f18d08e54bcf266b9a1a9926e1c698074146a0f8d5d0062b8d	2026-09-07 02:01:38.873551+03	20260907020000_livestock_age_origin	\N	\N	2026-09-07 02:01:38.852127+03	1
492eb36e-fdf0-444c-bc2b-f4bd9a25c585	00d8da137ad3df6bd92e5257cbb85fbd617b5a06791a396fc4bbf89826add215	2026-09-22 16:40:17.346761+03	20260922170000_subscription_payment_proofs	\N	\N	2026-09-22 16:40:17.061827+03	1
9a0deeff-39e5-4983-94df-28d5db559c5f	f3e2758efe17edffbde0eaeb26b4c8024435d0ca8decf2930134699734c1cdd9	2026-09-23 00:06:38.177235+03	20260922200000_subscription_ads_remaining	\N	\N	2026-09-23 00:06:38.167401+03	1
8a82b8ee-a78d-4d41-ab66-91d8c3ac5a41	82c545166fbe51eab0d15114da30acf221530269eaf10dd9bc2d0bc4151395ca	\N	20260925080000_retire_legacy_roles	A migration failed to apply. New migrations cannot be applied before the error is recovered from. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve\n\nMigration name: 20260925080000_retire_legacy_roles\n\nDatabase error code: 23505\n\nDatabase error:\nERROR: duplicate key value violates unique constraint "role_permissions_role_permission_id_key"\nDETAIL: Key (role, permission_id)=(COMPANY_ADMIN, 1) already exists.\n\nDbError { severity: "ERROR", parsed_severity: Some(Error), code: SqlState(E23505), message: "duplicate key value violates unique constraint \\"role_permissions_role_permission_id_key\\"", detail: Some("Key (role, permission_id)=(COMPANY_ADMIN, 1) already exists."), hint: None, position: None, where_: None, schema: Some("public"), table: Some("role_permissions"), column: None, datatype: None, constraint: Some("role_permissions_role_permission_id_key"), file: Some("nbtinsert.c"), line: Some(673), routine: Some("_bt_check_unique") }\n\n   0: sql_schema_connector::apply_migration::apply_script\n           with migration_name="20260925080000_retire_legacy_roles"\n             at schema-engine\\connectors\\sql-schema-connector\\src\\apply_migration.rs:106\n   1: schema_core::commands::apply_migrations::Applying migration\n           with migration_name="20260925080000_retire_legacy_roles"\n             at schema-engine\\core\\src\\commands\\apply_migrations.rs:91\n   2: schema_core::state::ApplyMigrations\n             at schema-engine\\core\\src\\state.rs:226	2026-09-25 08:28:58.918092+03	2026-09-25 08:28:26.622979+03	0
7acf98ca-c44c-4150-aefe-17c2b218b345	633ac1ba14522f351c788c5cc7550b8d15789f02fb275b710b9f47d9959e1993	2026-09-25 08:29:02.410454+03	20260925080000_retire_legacy_roles	\N	\N	2026-09-25 08:29:01.805058+03	1
7af0eaa5-71cc-4dae-a22b-ecb5c6277a89	a4db130095dcd90534afb3d05a6a8872c046de3a5c80335286d13c05fc27df4a	2026-09-26 08:35:31.488113+03	20260926090000_electricity_annual_plans	\N	\N	2026-09-26 08:35:31.454193+03	1
2c481d7c-cad5-4feb-8354-ed48732edef2	0ad2c8f533e38223f7cc5c1c0748dabcbb38c31c3d78ee9704be61a5800efa9c	2026-09-26 08:51:06.198845+03	20260926100000_subscription_plan_terms	\N	\N	2026-09-26 08:51:06.172651+03	1
c4e8a1b2-7d09-4f6a-9c33-1b6e5a0d88f1	56994d552dd1a0c202d7b11d901e5ab5270833edf11391dd25afb02a96ee31bb	2026-09-26 09:10:00+03	20260926110000_subscription_paid_details	\N	\N	2026-09-26 09:10:00+03	1
\.


--
-- Data for Name: admin_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.admin_sessions (id, user_id, role, user_agent_hash, last_seen_at, expires_at, revoked_at, created_at) FROM stdin;
c4551f46ec7b9bdd2835b897211b1c0c942c9130cd8f39d0	7	COMPANY_ADMIN	8792e0aa5199c3c96d7a6827b7e92d1a4205a865	2026-08-10 16:35:28.990	2026-08-11 04:03:16.552	2026-08-10 16:36:29.646	2026-08-10 16:03:16.566
130d2df63623199e42cbaca6541bdd55a15466b54fd6498a	1	SUPER_ADMIN	8792e0aa5199c3c96d7a6827b7e92d1a4205a865	2026-08-10 17:53:49.610	2026-08-11 05:53:46.560	2026-08-10 17:53:58.891	2026-08-10 17:53:46.584
ca346393e5acb9116a566f924cd83b2bb5fc117e8d6168c2	1	SUPER_ADMIN	8792e0aa5199c3c96d7a6827b7e92d1a4205a865	2026-08-10 18:00:17.165	2026-08-11 05:54:14.948	2026-08-10 18:21:38.752	2026-08-10 17:54:14.962
b8a02716a242f2b32d8125644168853817d1bd71da407854	1	SUPER_ADMIN	8792e0aa5199c3c96d7a6827b7e92d1a4205a865	2026-08-10 20:21:20.015	2026-08-11 08:06:18.575	2026-08-10 20:27:26.018	2026-08-10 20:06:18.580
54405c5a1a36b91ae76a0b52d327cf58b759ffa2f8e312b8	16	COMPANY_ADMIN	8792e0aa5199c3c96d7a6827b7e92d1a4205a865	2026-08-10 20:26:46.993	2026-08-11 08:21:44.593	2026-08-10 20:27:17.363	2026-08-10 20:21:44.599
c31cf2e01f28ddc5e6995dd90f558df781a42bc4b81fed12	1	SUPER_ADMIN	8792e0aa5199c3c96d7a6827b7e92d1a4205a865	2026-08-10 20:37:27.041	2026-08-11 08:27:26.018	2026-08-10 20:37:29.052	2026-08-10 20:27:26.025
d31d83260777e65ec7b1b9178a363a05d93e2f4bc07077cd	1	SUPER_ADMIN	8792e0aa5199c3c96d7a6827b7e92d1a4205a865	2026-08-10 21:02:51.725	2026-08-11 08:38:50.244	2026-08-11 08:15:24.125	2026-08-10 20:38:50.254
6d83c6d0188e59ed61fc6175ce33a531088ebafc37c97c40	1	SUPER_ADMIN	8792e0aa5199c3c96d7a6827b7e92d1a4205a865	2026-08-11 09:29:10.457	2026-08-11 21:19:27.264	2026-08-11 09:30:08.425	2026-08-11 09:19:27.278
e78fb2841d5082bdb04399599200a25f4e3861521cf5a091	6	COMPANY_ADMIN	8792e0aa5199c3c96d7a6827b7e92d1a4205a865	2026-08-11 09:42:37.561	2026-08-11 21:30:34.808	2026-08-11 10:03:57.452	2026-08-11 09:30:34.817
b453505383d875f290da1945e5f5d3a6b6137fdc55dac495	6	COMPANY_ADMIN	8792e0aa5199c3c96d7a6827b7e92d1a4205a865	2026-08-11 10:28:06.513	2026-08-11 22:04:10.844	2026-08-11 10:44:54.623	2026-08-11 10:04:10.866
d96c6e0458a4631d2e526d6527f1ee97f0cc2b9d0fea75c0	6	COMPANY_ADMIN	8792e0aa5199c3c96d7a6827b7e92d1a4205a865	2026-08-11 12:56:39.244	2026-08-11 22:45:19.076	2026-08-11 12:56:49.802	2026-08-11 10:45:19.100
d2cee1e6c1c6cd5ff46d61b33ce92f00279b1aeaa19c5f88	16	COMPANY_ADMIN	8792e0aa5199c3c96d7a6827b7e92d1a4205a865	2026-08-11 13:02:14.203	2026-08-12 00:57:12.886	2026-08-11 13:02:47.876	2026-08-11 12:57:12.894
eb9b085a25a57e940b1e9dfdd5b4b27293d64a7a22a12764	15	COMPANY_ADMIN	8792e0aa5199c3c96d7a6827b7e92d1a4205a865	2026-08-11 13:21:07.568	2026-08-12 01:03:06.736	2026-08-11 13:21:11.721	2026-08-11 13:03:06.746
67be8105402c82086ab3a102589f46c7319fe38ee80981db	1	SUPER_ADMIN	8792e0aa5199c3c96d7a6827b7e92d1a4205a865	2026-08-11 17:01:31.290	2026-08-12 03:37:37.559	2026-08-11 17:24:21.804	2026-08-11 15:37:37.568
5b3b81162c8a0d30bb43db7af76017d11740168ac09c3b72	1	SUPER_ADMIN	8792e0aa5199c3c96d7a6827b7e92d1a4205a865	2026-08-11 18:35:20.845	2026-08-12 05:29:28.927	2026-08-11 19:19:04.822	2026-08-11 17:29:28.948
299a8882a7edd77d2e540c8436e6f42deb36391a2ec84360	1	SUPER_ADMIN	8792e0aa5199c3c96d7a6827b7e92d1a4205a865	2026-08-11 19:32:28.197	2026-08-12 07:23:06.761	2026-08-11 19:39:18.351	2026-08-11 19:23:06.809
35f1e78d3231a1def70e9f291df225ddbc41d16a7ac6c14d	7	COMPANY_ADMIN	8792e0aa5199c3c96d7a6827b7e92d1a4205a865	2026-08-11 20:56:31.007	2026-08-12 08:32:44.068	2026-08-11 20:57:01.201	2026-08-11 20:32:44.095
f0fbaebb26e5a89b7a38be0ea9687a88d56f4711f602468b	18	COMPANY_ADMIN	8792e0aa5199c3c96d7a6827b7e92d1a4205a865	2026-08-11 20:58:10.347	2026-08-12 08:57:09.983	2026-08-11 20:58:36.036	2026-08-11 20:57:09.988
3e07cbd9259c29697cdb0fc4ed7a3f590c78f3cedac85d2e	19	COMPANY_ADMIN	8792e0aa5199c3c96d7a6827b7e92d1a4205a865	2026-08-11 21:19:23.515	2026-08-12 08:59:06.366	2026-08-11 21:19:49.436	2026-08-11 20:59:06.368
f6c01d13791f661dbb0f2435b9dc49e2ca0b91ef58c59541	1	SUPER_ADMIN	8792e0aa5199c3c96d7a6827b7e92d1a4205a865	2026-08-11 21:25:58.440	2026-08-12 09:23:52.995	2026-08-11 23:29:34.246	2026-08-11 21:23:53.005
bc82c9e0ab11d1731a3c16843112faa7214d244d76d73045	1	SUPER_ADMIN	8792e0aa5199c3c96d7a6827b7e92d1a4205a865	2026-08-11 23:33:36.690	2026-08-12 11:29:34.246	2026-08-11 23:34:24.393	2026-08-11 23:29:34.256
04183e24f3d80c9d476a00932788d9dc1a7d266f8e8f1eb4	1	SUPER_ADMIN	8792e0aa5199c3c96d7a6827b7e92d1a4205a865	2026-08-12 00:01:26.481	2026-08-12 11:35:06.640	2026-08-12 00:01:59.368	2026-08-11 23:35:06.647
ce7d0f9f34f306e98d973997097c8bad223d5bbf0e967edc	1	SUPER_ADMIN	8792e0aa5199c3c96d7a6827b7e92d1a4205a865	2026-08-12 00:48:50.641	2026-08-12 12:34:08.894	2026-08-12 00:49:23.579	2026-08-12 00:34:08.915
3f867d886d7b86c97dbd5e17f82be686c992bab73d2c43af	1	SUPER_ADMIN	8792e0aa5199c3c96d7a6827b7e92d1a4205a865	2026-08-12 02:14:56.146	2026-08-12 12:50:04.445	2026-08-12 04:47:40.909	2026-08-12 00:50:04.460
a4cceb3932502830e19c15f9c860cd7d5adea63b95380f59	1	SUPER_ADMIN	8792e0aa5199c3c96d7a6827b7e92d1a4205a865	2026-08-12 06:10:23.625	2026-08-12 16:48:46.170	2026-08-12 06:23:27.539	2026-08-12 04:48:46.211
f734c941efcb69e80276c1643be1072dbfe4c7f8c899dc6e	1	SUPER_ADMIN	8792e0aa5199c3c96d7a6827b7e92d1a4205a865	2026-08-12 07:37:28.866	2026-08-12 19:16:21.686	2026-08-12 07:37:52.560	2026-08-12 07:16:21.706
592231ae47be9b28e76df455d9ff1d06d08c8444f04fed7c	1	SUPER_ADMIN	8792e0aa5199c3c96d7a6827b7e92d1a4205a865	2026-08-12 07:44:24.945	2026-08-12 19:44:22.852	2026-08-12 08:20:24.960	2026-08-12 07:44:22.877
d900c8cd34a9aa312bede335188d8f6bb2c8ba12ad6e93be	1	SUPER_ADMIN	f68dfdd52d35a9975973fe0c537fd0067d8b68dc	2026-08-12 08:20:24.960	2026-08-12 20:20:24.960	2026-08-12 08:23:06.071	2026-08-12 08:20:24.966
feaf857183734d93b2743b683234174e5c430640c12976e2	1	SUPER_ADMIN	f68dfdd52d35a9975973fe0c537fd0067d8b68dc	2026-08-12 08:23:06.071	2026-08-12 20:23:06.071	2026-08-12 08:26:16.918	2026-08-12 08:23:06.078
40bccd66a76089ebe2e49eafec9eabfc2526d9786ce66fc2	1	SUPER_ADMIN	f68dfdd52d35a9975973fe0c537fd0067d8b68dc	2026-08-12 08:26:16.918	2026-08-12 20:26:16.918	2026-08-12 08:29:43.654	2026-08-12 08:26:16.935
10299b9e962e06dcecbdb6bb49425267b1fc32383f188978	1	SUPER_ADMIN	8792e0aa5199c3c96d7a6827b7e92d1a4205a865	2026-08-12 08:29:45.974	2026-08-12 20:29:43.654	2026-08-12 08:29:49.732	2026-08-12 08:29:43.664
fa4844ec943758b4dacaee013a5c04c7483f08a34733dab7	1	SUPER_ADMIN	8792e0aa5199c3c96d7a6827b7e92d1a4205a865	2026-08-12 08:50:27.645	2026-08-12 20:49:25.502	2026-08-12 08:50:54.014	2026-08-12 08:49:25.520
26002e78b74d8be9e34000117fb824870d1fd65673f3a5ec	1	SUPER_ADMIN	8792e0aa5199c3c96d7a6827b7e92d1a4205a865	2026-08-12 09:56:30.328	2026-08-12 21:56:29.052	2026-08-12 09:57:17.039	2026-08-12 09:56:29.060
21b88ef1edfa0364a7ff6a026d541659cc04959b25625c1c	1	SUPER_ADMIN	8792e0aa5199c3c96d7a6827b7e92d1a4205a865	2026-08-12 10:46:07.469	2026-08-12 22:45:05.612	2026-08-12 10:46:56.486	2026-08-12 10:45:05.623
7517027088673070071e084a77a87a0b77ece81f73654d83	1	SUPER_ADMIN	8792e0aa5199c3c96d7a6827b7e92d1a4205a865	2026-08-12 10:48:11.382	2026-08-12 22:48:10.511	2026-08-12 10:48:40.049	2026-08-12 10:48:10.516
6abea44bbb354c4f764d5031d35125c5d2327152de4a40b6	1	SUPER_ADMIN	8792e0aa5199c3c96d7a6827b7e92d1a4205a865	2026-08-12 10:50:31.702	2026-08-12 22:50:30.487	2026-08-12 10:51:27.074	2026-08-12 10:50:30.495
209aa9d49b39920a29c56c2365a706d3c885edbd24e65c4c	7	COMPANY_ADMIN	8792e0aa5199c3c96d7a6827b7e92d1a4205a865	2026-08-12 10:57:47.664	2026-08-12 22:51:46.360	2026-08-12 10:58:27.318	2026-08-12 10:51:46.365
c72347a664eac74f6fb1737f79515941ad86b2df71dba211	1	SUPER_ADMIN	8792e0aa5199c3c96d7a6827b7e92d1a4205a865	2026-08-15 20:56:36.239	2026-08-16 08:55:34.075	2026-08-15 20:56:52.537	2026-08-15 20:55:34.090
0f3fe41b6440a2c02be93af164804d12b42b70873d17f38b	1	SUPER_ADMIN	8792e0aa5199c3c96d7a6827b7e92d1a4205a865	2026-08-15 22:47:02.527	2026-08-16 09:06:32.749	2026-08-15 22:47:04.434	2026-08-15 21:06:32.770
002c5b9855c4d234462e1f657a1a0ae99af85a64d0af45c6	1	SUPER_ADMIN	40956f08f6c9af83802ecd226385c678a06f995e	2026-08-16 09:15:50.876	2026-08-16 20:55:22.023	2026-08-16 09:16:03.432	2026-08-16 08:55:22.056
abe34d3ffbf2b8531cc62fc37c17b553077c2f07825b9ab6	1	SUPER_ADMIN	8792e0aa5199c3c96d7a6827b7e92d1a4205a865	2026-08-16 20:16:22.990	2026-08-17 08:13:20.402	2026-08-16 20:16:33.824	2026-08-16 20:13:20.418
f2fa0d6f39216717cf90afe0ccc055442932dc98044a21c6	1	SUPER_ADMIN	8792e0aa5199c3c96d7a6827b7e92d1a4205a865	2026-08-19 12:32:45.685	2026-08-20 00:32:28.633	2026-08-19 12:33:28.867	2026-08-19 12:32:28.641
ac15cc3a4798ad85fc46e9874ad32668e7ca14ce6e56b851	1	SUPER_ADMIN	8792e0aa5199c3c96d7a6827b7e92d1a4205a865	2026-08-19 13:38:04.014	2026-08-20 01:35:24.229	2026-08-19 13:38:30.262	2026-08-19 13:35:24.258
dadb60c6e20bd605d9c315e4cf7bc30106e4436354664063	1	SUPER_ADMIN	8792e0aa5199c3c96d7a6827b7e92d1a4205a865	2026-08-20 17:04:21.333	2026-08-21 04:39:17.948	2026-08-20 17:05:09.464	2026-08-20 16:39:17.973
d791a8d6ddd1b5a7ea10ce36cd30ce843a21a184fe1bbcfe	1	SUPER_ADMIN	8792e0aa5199c3c96d7a6827b7e92d1a4205a865	2026-08-20 17:36:17.619	2026-08-21 05:26:07.307	2026-08-20 17:36:23.276	2026-08-20 17:26:07.335
7763fad53af21257a8c57c0f3cf85e5bb0765fd6013aa95e	1	SUPER_ADMIN	8792e0aa5199c3c96d7a6827b7e92d1a4205a865	2026-08-22 11:09:43.903	2026-08-22 22:22:11.121	2026-08-22 11:10:44.593	2026-08-22 10:22:11.132
122533f4f044163853fc96123e44ab8c869ed510609764ea	1	SUPER_ADMIN	8792e0aa5199c3c96d7a6827b7e92d1a4205a865	2026-08-22 11:46:57.353	2026-08-22 23:15:08.693	2026-08-22 18:19:21.478	2026-08-22 11:15:08.702
a35fae5f77e8967fe047bbd727fce71d078aaa18f0120745	1	SUPER_ADMIN	8792e0aa5199c3c96d7a6827b7e92d1a4205a865	2026-08-22 18:45:38.865	2026-08-23 06:19:21.478	2026-08-22 18:46:39.158	2026-08-22 18:19:21.519
cd6d2e2d6127f233ee9a79c2a6291a974efbfb818b15a8fc	1	SUPER_ADMIN	40956f08f6c9af83802ecd226385c678a06f995e	2026-08-24 11:17:31.537	2026-08-24 22:44:25.262	2026-08-24 11:18:31.370	2026-08-24 10:44:25.268
7813770d68f4da0229b4ae2ba6323533dd8b9704a0dce5a5	1	SUPER_ADMIN	40956f08f6c9af83802ecd226385c678a06f995e	2026-08-24 13:04:31.181	2026-08-24 23:54:24.940	2026-08-24 13:05:34.318	2026-08-24 11:54:24.965
3679bdabd741e028d78db333b58719f010f4d73b63a88529	1	SUPER_ADMIN	70a0a7191a9bb6b3d3cc0aa17e3247f1feaa9347	2026-08-25 06:07:59.636	2026-08-25 18:06:57.508	2026-08-25 06:08:09.386	2026-08-25 06:06:57.527
a22dd368eae004df31d2bf9bbcabd446031ed8e32cc136e5	1	SUPER_ADMIN	70a0a7191a9bb6b3d3cc0aa17e3247f1feaa9347	2026-08-25 08:25:06.482	2026-08-25 19:59:58.083	2026-08-25 08:26:11.167	2026-08-25 07:59:58.091
3fd2035f3a252df2be5ee0674c78e880a9f1b44c82f04775	1	SUPER_ADMIN	40956f08f6c9af83802ecd226385c678a06f995e	2026-08-25 08:26:11.901	2026-08-25 20:26:11.167	2026-08-25 08:26:53.217	2026-08-25 08:26:11.172
611fb63f8a1613ea4050a4e8e72f04ecba8cc86473b44331	1	SUPER_ADMIN	8792e0aa5199c3c96d7a6827b7e92d1a4205a865	2026-08-26 07:36:18.714	2026-08-26 19:23:49.225	2026-08-26 07:37:18.528	2026-08-26 07:23:49.250
2c96c2e85705c12443a2dad434f81b7dafbb45a4dd0dbf9f	1	SUPER_ADMIN	8792e0aa5199c3c96d7a6827b7e92d1a4205a865	2026-08-28 07:04:16.372	2026-08-28 17:55:42.143	2026-08-28 07:04:16.378	2026-08-28 05:55:42.151
350e79581b8ac696b2138e39d57ddc699296af7940ea97c6	1	SUPER_ADMIN	8792e0aa5199c3c96d7a6827b7e92d1a4205a865	2026-08-28 08:22:40.075	2026-08-28 19:07:08.077	2026-08-28 08:35:51.917	2026-08-28 07:07:08.086
ac92e582e54e55c6415469a299338a2b4aae0406d48e1605	1	SUPER_ADMIN	8792e0aa5199c3c96d7a6827b7e92d1a4205a865	2026-08-29 12:14:20.119	2026-08-30 00:00:11.607	2026-08-29 12:14:38.383	2026-08-29 12:00:11.659
f756dcf96b12075c5b62ace823843b14b2567a842764c4b6	1	SUPER_ADMIN	8792e0aa5199c3c96d7a6827b7e92d1a4205a865	2026-08-29 12:43:40.571	2026-08-30 00:14:52.571	2026-08-29 12:44:37.939	2026-08-29 12:14:52.589
4fb1f2aa5c0cead1a1c5f9cdc25d1cd323a6ee40dbade369	1	SUPER_ADMIN	8792e0aa5199c3c96d7a6827b7e92d1a4205a865	2026-08-29 13:49:30.653	2026-08-30 01:47:29.026	2026-08-29 14:06:24.661	2026-08-29 13:47:29.040
ff831741cb44862d1168dd41b7354803f24cfd1ef410a21d	1	SUPER_ADMIN	8792e0aa5199c3c96d7a6827b7e92d1a4205a865	2026-08-29 19:26:46.253	2026-08-30 05:59:45.403	2026-08-29 19:31:03.077	2026-08-29 17:59:45.434
80a734ed19c5224192860ee75519288afa58c64f774f31e9	1	SUPER_ADMIN	8792e0aa5199c3c96d7a6827b7e92d1a4205a865	2026-08-29 19:40:39.752	2026-08-30 07:31:18.925	2026-08-29 19:49:35.153	2026-08-29 19:31:18.938
fa6e775510167c2319eeed6120be4a09165070e2cc6ac206	1	SUPER_ADMIN	8792e0aa5199c3c96d7a6827b7e92d1a4205a865	2026-08-29 20:01:36.091	2026-08-30 07:49:50.946	2026-08-30 07:08:35.842	2026-08-29 19:49:50.952
0fa58299377624f95803749163afe8360afa2665ffa8190c	1	SUPER_ADMIN	8792e0aa5199c3c96d7a6827b7e92d1a4205a865	2026-08-30 08:54:22.258	2026-08-30 20:35:35.091	2026-08-30 09:01:17.751	2026-08-30 08:35:35.116
11d36fed7b5a0631728c7a894f09f469bc600fdd3911cace	1	SUPER_ADMIN	8792e0aa5199c3c96d7a6827b7e92d1a4205a865	2026-08-30 09:19:31.863	2026-08-30 21:01:32.354	2026-08-30 09:21:31.870	2026-08-30 09:01:32.369
469d43c04931ad36d37b97d5df618b80f30189d75d018283	1	SUPER_ADMIN	8792e0aa5199c3c96d7a6827b7e92d1a4205a865	2026-08-30 11:21:32.059	2026-08-30 23:10:47.210	2026-08-30 11:21:39.731	2026-08-30 11:10:47.220
62f56625520ff4eb3904b4f7c2c36d31fa31f8914c11bfc9	1	SUPER_ADMIN	8792e0aa5199c3c96d7a6827b7e92d1a4205a865	2026-08-30 11:31:52.944	2026-08-30 23:24:13.932	2026-08-30 11:32:38.015	2026-08-30 11:24:13.939
e91a1c7fbd3833fbe1b38eb4861e5ab97c6ade0ba298edca	1	SUPER_ADMIN	8792e0aa5199c3c96d7a6827b7e92d1a4205a865	2026-08-30 12:05:42.774	2026-08-30 23:32:59.454	2026-08-30 13:38:28.255	2026-08-30 11:32:59.466
1ca152ce1ffbc227aa3dce947a9a90e63967045ccbac895d	1	SUPER_ADMIN	8792e0aa5199c3c96d7a6827b7e92d1a4205a865	2026-08-30 14:02:14.724	2026-08-31 01:39:14.150	2026-08-30 14:03:10.529	2026-08-30 13:39:14.153
5329143f6d4532648c21b58b8ef14b5af975ca4fd6d8f068	1	SUPER_ADMIN	8792e0aa5199c3c96d7a6827b7e92d1a4205a865	2026-08-30 15:19:49.890	2026-08-31 02:03:10.529	2026-08-30 17:25:58.740	2026-08-30 14:03:10.531
e3f96bd40ab5b320d3ad6bd6634b4d73ba3f3f22c1577d30	1	SUPER_ADMIN	8792e0aa5199c3c96d7a6827b7e92d1a4205a865	2026-08-30 19:43:28.069	2026-08-31 05:32:07.430	2026-08-30 20:05:53.937	2026-08-30 17:32:07.469
3122032986599c806deac73c5aba29e51a7ed411c1ada5e9	1	SUPER_ADMIN	8792e0aa5199c3c96d7a6827b7e92d1a4205a865	2026-08-30 20:21:31.956	2026-08-31 08:05:53.937	2026-08-31 07:45:26.934	2026-08-30 20:05:53.944
92cccdb94c5402791b518528fef52b47b312cfefd0acccfa	1	SUPER_ADMIN	8792e0aa5199c3c96d7a6827b7e92d1a4205a865	2026-08-31 07:45:28.131	2026-08-31 19:45:26.934	2026-08-31 07:46:08.657	2026-08-31 07:45:26.952
68dfe78c1785f0ff73af48edc07c6280bd181a2e6505b9d8	1	SUPER_ADMIN	8792e0aa5199c3c96d7a6827b7e92d1a4205a865	2026-08-31 15:03:32.108	2026-09-01 02:13:24.768	2026-08-31 18:07:44.685	2026-08-31 14:13:24.788
087e2f21496c0f428dd7168da7e46d97654aa458fea73dc2	1	SUPER_ADMIN	8792e0aa5199c3c96d7a6827b7e92d1a4205a865	2026-08-31 18:18:21.388	2026-09-01 06:08:43.378	2026-09-01 20:49:21.526	2026-08-31 18:08:43.401
18c41d39abb42720c22ef783e4fa5f00c671bb9949b24439	1	SUPER_ADMIN	0e3fecd0a84c748dd5395e5a7238776a42c18d73	2026-09-01 20:49:21.526	2026-09-02 08:49:21.526	2026-09-01 20:50:28.239	2026-09-01 20:49:21.531
f9a7f8c59059b8ce4166386fbeb23fafdb96e4d038dc213e	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-01 20:51:38.209	2026-09-02 08:50:28.239	2026-09-01 20:52:08.489	2026-09-01 20:50:28.243
6777516ddacb6c4760a30872467f4e182ad369b1e76622a9	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-01 21:04:26.526	2026-09-02 09:04:25.526	2026-09-01 21:04:52.029	2026-09-01 21:04:25.533
79161654742ca72093be74588671ff92c9605bb45e4f238d	15	COMPANY_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-01 21:23:30.096	2026-09-02 09:21:20.226	2026-09-01 21:24:17.648	2026-09-01 21:21:20.233
46e54791c9d90928a5c71075f17b241e5f9711ef8430fb1e	16	COMPANY_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-01 21:32:22.210	2026-09-02 09:28:21.713	2026-09-01 21:33:07.901	2026-09-01 21:28:21.717
d79c08733fe9b97ae3ea806d9e03df3b1c254c6b2cf8cea7	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-01 21:37:17.203	2026-09-02 09:33:16.031	2026-09-01 21:37:37.564	2026-09-01 21:33:16.034
33ce242b49c687167c06cb26e40ca540bc2ff0b80a0a6675	16	COMPANY_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-01 22:02:44.217	2026-09-02 09:39:29.097	2026-09-01 22:02:47.755	2026-09-01 21:39:29.101
d4b71de53c649b66b2aa4e9dc60b4e959b50e25665ca2838	15	COMPANY_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-01 22:05:26.221	2026-09-02 10:03:25.141	2026-09-01 22:05:33.702	2026-09-01 22:03:25.149
8baf0848e71a984fcd64555e643f57fec71d5cbf854b6b26	7	COMPANY_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-01 22:10:44.199	2026-09-02 10:05:57.712	2026-09-01 22:10:57.722	2026-09-01 22:05:57.715
39affc9c8d834561f57f92cd49d76200e7f25b171fb62d45	16	COMPANY_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-01 22:20:29.177	2026-09-02 10:11:21.694	2026-09-01 22:21:15.261	2026-09-01 22:11:21.699
4d36b61e90cb346ff7dba2665608c08cf1b4370fd1af349c	7	COMPANY_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-01 22:39:12.556	2026-09-02 10:39:11.662	2026-09-01 22:39:16.311	2026-09-01 22:39:11.672
cf0b2501be5cbd8a6a37c51459347a1308b3116407887a05	15	COMPANY_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-01 22:54:24.209	2026-09-02 10:39:26.407	2026-09-01 22:55:11.908	2026-09-01 22:39:26.410
00d8f221ab28dae4d4731e73cc39d9df0e2899646f857caa	7	COMPANY_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-01 22:55:24.199	2026-09-02 10:55:19.786	2026-09-01 22:55:53.766	2026-09-01 22:55:19.859
43ade4485091c8d3006e4af172d485a42963a22d8b7e175d	7	COMPANY_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-01 22:55:54.409	2026-09-02 10:55:53.766	2026-09-01 22:56:02.087	2026-09-01 22:55:53.771
24babc4b6fdf69ae61eb5c62c0ba6c6a9e425a53ab59ad66	15	COMPANY_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-01 23:01:33.231	2026-09-02 10:56:07.167	2026-09-01 23:01:50.924	2026-09-01 22:56:07.171
df65baf3099281971b0acb467f7536370baf433b2f595687	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-01 23:22:42.831	2026-09-02 11:20:41.430	2026-09-01 23:23:26.094	2026-09-01 23:20:41.434
47020e6c87a085a990ab6602c3599ec29b1eefd9590b5fce	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-01 23:24:00.935	2026-09-02 11:24:00.290	2026-09-01 23:24:21.115	2026-09-01 23:24:00.294
9be5ac9b8aeef1259e8bf0479b6bd1ff7f9f17b65284519a	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-01 23:34:11.439	2026-09-02 11:29:10.559	2026-09-01 23:34:46.120	2026-09-01 23:29:10.563
d6f3b25830e260f8355d79afa8816800e53ce6024ca4e49d	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-01 23:36:03.364	2026-09-02 11:36:02.356	2026-09-01 23:36:19.129	2026-09-01 23:36:02.362
cd858c3f3bbbfb9e2830f7703eacd2fe9a0362e757bc0d3d	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-01 23:38:05.194	2026-09-02 11:37:03.632	2026-09-01 23:38:19.382	2026-09-01 23:37:03.637
12375807c6270864e8a39f2d1881c3268bb94d8ea0f38fe8	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-02 00:14:43.232	2026-09-02 11:56:53.936	2026-09-02 00:19:12.160	2026-09-01 23:56:53.941
79193dab3e50c97564a2abcd798e4cb66dd2f1fa9270df17	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-02 00:27:02.200	2026-09-02 12:25:00.318	2026-09-02 00:29:16.085	2026-09-02 00:25:00.427
7beca7d9502be1606285942bd35978a1208091ebb8c9d0c5	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-02 00:30:20.299	2026-09-02 12:29:19.248	2026-09-02 00:31:09.505	2026-09-02 00:29:19.251
128e5005a518c403742b50ccc8ba3514e4fad5c2edf3a5d8	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-02 01:54:16.065	2026-09-02 13:52:42.515	2026-09-02 01:55:00.427	2026-09-02 01:52:42.524
22bbab6b5cf1a59091bc0414c2194a6b0270895fe451a1fa	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-02 01:58:19.739	2026-09-02 13:58:18.683	2026-09-02 01:58:21.290	2026-09-02 01:58:18.686
0906c3986e119547e42636c73e6c402d839388eb6ed8784c	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-02 01:58:22.257	2026-09-02 13:58:21.290	2026-09-02 01:59:09.828	2026-09-02 01:58:21.296
d2aebd9d9cee72dc978ea908f916947bcd9f1dd96ec56429	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-02 02:00:15.198	2026-09-02 14:00:14.533	2026-09-02 02:00:58.924	2026-09-02 02:00:14.540
49c93a4a5e00a4709d1b8c48274eded63b2165c0d235115f	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-02 02:01:57.210	2026-09-02 14:01:56.495	2026-09-02 02:02:08.963	2026-09-02 02:01:56.506
deae3a89d2a88d7af2cca42004e340d31957bbdb92af5eb9	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-02 02:02:37.118	2026-09-02 14:02:36.464	2026-09-02 02:09:59.394	2026-09-02 02:02:36.471
d2c70f77ea7c4abdf684807201e04724c3d5238f931d6816	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-02 02:22:24.619	2026-09-02 14:09:59.394	2026-09-02 02:22:28.617	2026-09-02 02:09:59.401
83cd3ce15a153152b42d6253103c2afcd07bbc34be7208ef	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-02 02:24:31.626	2026-09-02 14:22:42.881	2026-09-02 02:25:03.592	2026-09-02 02:22:42.932
9e8bb1714ac811105c05e04470d6ecce7eb65606f6ee8ac1	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-02 09:04:54.524	2026-09-02 21:04:53.152	2026-09-02 09:05:42.359	2026-09-02 09:04:53.221
91d1aeb3ed1fca9884527a176df35fb76b508f04607d1bdf	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-02 09:19:13.012	2026-09-02 21:14:10.958	2026-09-02 09:19:37.135	2026-09-02 09:14:10.962
2c298e7c7491e6f8d792ce556a24f0f0152de5b8601bb3e9	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-02 09:58:58.183	2026-09-02 21:52:56.901	2026-09-02 09:59:57.379	2026-09-02 09:52:56.907
472e368eca3e55b8d8baabb61a220f552f4201924e63331e	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-02 10:07:37.899	2026-09-02 22:07:24.382	2026-09-02 10:07:52.758	2026-09-02 10:07:24.391
acdbdcf344cca7898b3fae4736ed3a86f714a1dd946be4f6	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-02 10:09:16.558	2026-09-02 22:09:12.752	2026-09-02 10:10:45.403	2026-09-02 10:09:12.755
3ae44a28f83274fcec68c7c9d0ba679b9eb88ad2b5bdce32	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-02 10:10:46.387	2026-09-02 22:10:45.403	2026-09-02 10:10:46.681	2026-09-02 10:10:45.410
bab2cb0bff29ba433df1994afa76129ac3ad6257bf136123	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-02 10:11:20.199	2026-09-02 22:10:46.681	2026-09-02 10:15:54.990	2026-09-02 10:10:46.684
3c03befb9abf971f21a12786c2734b2940646abf13f1a8d8	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-02 10:17:20.952	2026-09-02 22:15:54.990	2026-09-02 10:18:39.052	2026-09-02 10:15:54.995
bfdedae2e5c0904bc922c842be50d35260948afbfe6bdda7	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-02 10:25:40.302	2026-09-02 22:18:39.052	2026-09-02 10:25:44.439	2026-09-02 10:18:39.140
68134aaa532456cd83f62cc7e6466a7a38945fd88b65798f	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-02 10:40:18.024	2026-09-02 22:40:07.744	2026-09-02 10:50:06.458	2026-09-02 10:40:07.799
a1ba1bcf0ef64ffb2b4a9ae23a06d940a68b75ab7feb6bdc	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-02 10:54:12.298	2026-09-02 22:50:06.458	2026-09-02 10:55:26.542	2026-09-02 10:50:06.552
a0b336a3c777c3c7dc8c488ffd1db08026016022e619f2ec	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-02 10:56:47.125	2026-09-02 22:55:26.542	2026-09-02 10:57:10.649	2026-09-02 10:55:26.552
5d5d745d6c27167241c85e69a65b902b335db0d4a58355ca	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-02 11:05:07.198	2026-09-02 23:04:05.347	2026-09-02 11:05:49.516	2026-09-02 11:04:05.355
b5bd061098b28045712c79e31b11d1d83544883690d0ce29	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-02 11:13:03.241	2026-09-02 23:07:42.432	2026-09-02 11:15:50.449	2026-09-02 11:07:42.439
20012db557a831f3e654c6f023ffcc1375194da429c8a6e7	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-02 11:39:45.147	2026-09-02 23:39:43.826	2026-09-02 11:40:27.634	2026-09-02 11:39:43.846
71c8693bc42694bec7adaee28a797378dd98232869d023af	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-02 11:40:37.925	2026-09-02 23:40:37.180	2026-09-02 11:41:19.015	2026-09-02 11:40:37.187
1a46a3474d2782434e732fed920b9b5305be46ccf705eb20	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-02 11:44:11.900	2026-09-02 23:43:11.312	2026-09-02 11:44:14.573	2026-09-02 11:43:11.316
b00e4259646057e1008e692f40dde16c49b3a47c45bad242	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-02 11:47:39.778	2026-09-02 23:47:38.999	2026-09-02 11:48:24.863	2026-09-02 11:47:39.072
93e109d3a2f30ffa7107d5dfc5ed61355cb75b277b235cf7	16	COMPANY_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-02 13:07:30.250	2026-09-03 01:01:28.155	2026-09-02 13:19:41.429	2026-09-02 13:01:28.266
1bb581ff8d45c5edf655c4b931f59e75d1fa2990b2ad928e	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-02 13:28:48.213	2026-09-03 01:21:49.343	2026-09-02 13:35:01.509	2026-09-02 13:21:49.354
d8d9bd3d164bf72a7935ce99cfb585d4d395f700158207ff	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-02 13:36:36.972	2026-09-03 01:35:20.375	2026-09-02 13:36:43.546	2026-09-02 13:35:20.380
7d18dfe4f039924f0644c9025b22b9f1e246f3445c88d7ef	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-02 13:39:32.210	2026-09-03 01:37:31.223	2026-09-02 13:39:43.029	2026-09-02 13:37:31.227
9adf3e26211c2a98d822703f8b3a3e5033bac5c9e5e87aa6	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-02 14:20:22.204	2026-09-03 02:18:20.221	2026-09-02 14:21:17.887	2026-09-02 14:18:20.232
093b91168b989c82e6d5d75653e6c484fa2b495ff47a5ede	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-02 14:31:36.145	2026-09-03 02:30:44.021	2026-09-02 14:36:35.021	2026-09-02 14:30:44.025
135c1bfb39226e6e5b5ff0f98ef8f92b76d39724ce0012ad	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-02 14:37:46.811	2026-09-03 02:36:35.021	2026-09-02 14:38:27.801	2026-09-02 14:36:35.025
7f0fb1d5f6f5919b5ff8af4361f8a8e7776adbf3ffb1a541	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-02 14:39:28.263	2026-09-03 02:38:27.801	2026-09-02 14:39:32.549	2026-09-02 14:38:27.809
f47594f9e65511d02b12519865eaf545ea5e218d7972863e	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-02 14:40:59.894	2026-09-03 02:40:59.366	2026-09-02 14:41:14.230	2026-09-02 14:40:59.370
eaf4b6162e25e04ccd49454573586ac239e287e1821447f8	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-02 14:58:14.869	2026-09-03 02:58:04.209	2026-09-02 14:58:19.286	2026-09-02 14:58:04.226
98e2d3dc9ae78a62204c25e855a96437fa66068ab395746e	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-02 15:14:26.206	2026-09-03 03:13:25.059	2026-09-02 15:14:42.449	2026-09-02 15:13:25.067
c1c7414a5f4cd1807d972054c00e17b4faf2d503f0ae86ce	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-02 16:09:42.232	2026-09-03 04:03:40.137	2026-09-02 16:10:12.963	2026-09-02 16:03:40.157
b14c504bbdb180767d71eb51fddd37e5d3e3b22821ba336a	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-02 16:57:12.205	2026-09-03 04:47:14.474	2026-09-02 16:57:21.593	2026-09-02 16:47:14.541
e417cb63f303ccf41c8ea9c94b1ac9adaa3351521c552b09	15	COMPANY_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-02 17:05:57.233	2026-09-03 05:05:56.339	2026-09-02 17:06:42.130	2026-09-02 17:05:56.365
649e239bcf0cbdec07d6a1fc63277c60e9b378f66cb7b7c6	15	COMPANY_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-02 17:09:33.971	2026-09-03 05:07:23.271	2026-09-02 17:09:43.441	2026-09-02 17:07:23.280
3c9a11d332364b84ef8a72f5ed64406e82007eebda599b1a	15	COMPANY_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-02 17:10:33.210	2026-09-03 05:09:43.441	2026-09-02 17:10:35.439	2026-09-02 17:09:43.446
071b8ef91d0ffa500a52f9f35995dd4406df3fd1ff357873	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-02 17:49:05.164	2026-09-03 05:49:03.026	2026-09-02 17:49:35.289	2026-09-02 17:49:03.159
1a4b3de1f31a64ab9759647cbee8e6332fc6ffa6ee994dd7	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-02 17:50:49.441	2026-09-03 05:50:48.860	2026-09-02 17:54:53.368	2026-09-02 17:50:48.869
26f17d2dbc513d742c8882e22d9b2ff96601973fa888eb00	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-02 17:55:15.864	2026-09-03 05:54:53.368	2026-09-02 18:02:05.697	2026-09-02 17:54:53.372
75bdb3dff062e41aa5b96f0632030b43f0b01b82d3e33572	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-02 18:02:28.873	2026-09-03 06:02:26.242	2026-09-02 19:23:31.342	2026-09-02 18:02:26.303
474bef42ed08ef0af15571aa23d58094f82b206896e6d17c	15	COMPANY_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-02 18:13:58.454	2026-09-03 06:03:59.684	2026-09-02 18:14:58.195	2026-09-02 18:03:59.692
99a7754ef3c72ea9a131d39c5bc8bb5c8d022c1bedc4f688	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-02 19:29:32.190	2026-09-03 07:23:31.342	2026-09-02 19:30:49.092	2026-09-02 19:23:31.350
f2db758f2c8adfffc8b85673f9410e71dcd8e844bc4a8f95	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-02 19:38:58.188	2026-09-03 07:30:52.933	2026-09-02 20:57:03.978	2026-09-02 19:30:52.937
7dc7b264d32727cf2c90eba4982cf7f15328344a025577fb	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-03 05:42:55.015	2026-09-03 16:26:51.914	2026-09-03 05:42:57.865	2026-09-03 04:26:52.050
fd97b16708465670cc55c4bd61a3d034f2f01fab8af7a7c9	15	COMPANY_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-03 05:49:41.267	2026-09-03 17:49:39.526	2026-09-03 05:50:12.430	2026-09-03 05:49:39.658
4d257a90a0098dd481f9b6782e6643b27d22d8cd00076047	7	COMPANY_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-03 05:51:41.064	2026-09-03 17:51:40.519	2026-09-03 05:51:58.316	2026-09-03 05:51:40.527
a3a65babdbef8741f86f6b12821bfffa09ee6fa28d679b9e	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-03 05:59:19.232	2026-09-03 17:53:17.951	2026-09-03 05:59:28.095	2026-09-03 05:53:17.954
e8b7f600dff3007383b48105634fef5bc8a4c621adcbf6be	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-03 06:20:58.173	2026-09-03 17:59:28.095	2026-09-03 06:22:02.195	2026-09-03 05:59:28.106
66049cae708de05d39d24f3d99a315916e40038208603def	15	COMPANY_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-03 06:32:16.701	2026-09-03 18:22:14.548	2026-09-03 06:32:20.907	2026-09-03 06:22:14.553
79d9573519f924c9f2ed279a5b46279093238989c2fdc8bf	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-03 06:48:38.722	2026-09-03 18:32:27.523	2026-09-03 06:49:16.737	2026-09-03 06:32:27.555
a961b7c7dfc707d570ca7cf07436ea55bb4149de75e2359b	7	COMPANY_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-03 07:01:25.246	2026-09-03 18:52:28.191	2026-09-03 07:02:04.448	2026-09-03 06:52:28.203
28991f7c4180021576654c18c40bc552ff0cde75cef3479f	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-03 07:05:37.886	2026-09-03 19:02:17.936	2026-09-03 07:06:17.475	2026-09-03 07:02:17.941
c774dbe6c1b7f787f68dc7c75a1abdf6b325dfd0545ac222	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-03 07:13:12.204	2026-09-03 19:06:21.054	2026-09-03 07:57:22.128	2026-09-03 07:06:21.056
52c67c0f85c78618f48e688c403ae7d72f6136012027a3a3	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-03 07:57:27.459	2026-09-03 19:57:26.225	2026-09-03 07:57:42.733	2026-09-03 07:57:26.258
c2d97ae3c630ce3270c4cd621c946778d4a6aa8b38cb86fd	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-03 07:58:45.246	2026-09-03 19:57:42.733	2026-09-03 07:59:19.657	2026-09-03 07:57:42.737
5184c4cdf1d5e3328d1fd3dbda8f4d54e71c4d3b8d45860c	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-03 08:06:57.064	2026-09-03 20:02:55.686	2026-09-03 08:39:20.703	2026-09-03 08:02:55.690
2c3cc717c2c7fbbe4c248b91e51a0b5d365290c885b3a3a3	7	COMPANY_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-03 08:07:02.877	2026-09-03 20:07:02.285	2026-09-03 08:07:05.566	2026-09-03 08:07:02.288
131dd6df241be8686c087e3a4dd239d73c9c242e5e5bc307	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-03 08:39:21.901	2026-09-03 20:39:20.703	2026-09-03 08:40:15.036	2026-09-03 08:39:20.776
a57ff1abb76363b253f83503f43139a1c24f2ef023da77c2	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-03 08:44:33.640	2026-09-03 20:44:32.789	2026-09-03 08:45:15.484	2026-09-03 08:44:32.800
c0763a27bb9f26e5cef5937ae7f6a581402b25b98bc8202e	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-03 08:50:38.082	2026-09-03 20:47:37.394	2026-09-03 09:14:55.182	2026-09-03 08:47:37.397
ab5e50db9347f8db84cc4872e8c2de6783fd08a23d6884b2	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-03 16:38:38.734	2026-09-04 04:31:36.551	2026-09-03 17:54:24.210	2026-09-03 16:31:36.570
7c45f61f0b932df5a29e32831ee4d7fd1dc9912428cc9566	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-04 19:23:08.457	2026-09-05 07:13:06.890	2026-09-04 19:23:42.434	2026-09-04 19:13:06.902
6dc618be9d6ef0373c2c1f473c928b3e63ea27de13529bb2	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-04 19:24:12.633	2026-09-05 07:24:11.854	2026-09-04 19:24:35.469	2026-09-04 19:24:11.859
9c84000d9646e0816b5fb4563fdeba6207fadef37b188e15	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-04 19:37:39.303	2026-09-05 07:25:38.376	2026-09-04 19:37:58.171	2026-09-04 19:25:38.386
98c7cd2f5d2cda7d4aa4b07e8821dcdc0353d2c43f7a6ec6	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-04 19:48:53.333	2026-09-05 07:37:58.171	2026-09-04 20:54:36.960	2026-09-04 19:37:58.177
c8833ae79371bd8254c661575889b1a97844887492d767ec	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-05 00:39:38.858	2026-09-05 12:39:36.207	2026-09-05 00:39:41.277	2026-09-05 00:39:36.227
c52cf6e442a36891af7359b2b594ea639a84018af139829b	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-05 02:17:25.442	2026-09-05 14:11:42.665	2026-09-05 10:01:05.373	2026-09-05 02:11:42.686
62b4930ec08d97fdf96e16b4999918afa7db09005c61abd4	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-05 10:11:53.264	2026-09-05 22:01:24.914	2026-09-05 11:30:24.140	2026-09-05 10:01:24.989
d178f0b741c756863c77d975977cd36b14d6df41ff410141	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-05 12:41:37.361	2026-09-06 00:41:37.361	2026-09-05 12:41:43.476	2026-09-05 12:41:37.445
0e2acf0a3db6b9f103198476631b8e212d1d132de32938b9	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-05 12:41:44.673	2026-09-06 00:41:43.476	2026-09-05 12:42:28.514	2026-09-05 12:41:43.481
1ae38ed72fa0ca3b3219c11c91b5bd0de73adb626a71ccce	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-05 14:23:55.767	2026-09-06 00:42:28.514	2026-09-05 14:23:58.101	2026-09-05 12:42:28.518
53131ca92308832f5678e349928d427678b9d6b053e7ae66	15	COMPANY_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-05 15:02:08.728	2026-09-06 02:24:31.728	2026-09-05 15:02:34.301	2026-09-05 14:24:31.802
243817df7769d23721a72651dcfabadeee64c423fa966bbe	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-05 15:03:48.676	2026-09-06 03:02:41.579	2026-09-05 15:04:05.149	2026-09-05 15:02:41.658
d90580afab17611e3c1db406f6dd48174bbdad24d32bc734	15	COMPANY_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-05 15:07:15.114	2026-09-06 03:04:13.954	2026-09-05 15:07:32.117	2026-09-05 15:04:13.980
fec17bfd04585dada54b01b146b7f08677b52defe349481b	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-05 15:08:07.683	2026-09-06 03:08:07.683	2026-09-05 15:08:16.423	2026-09-05 15:08:07.908
01da8152dd441427884d0486b5deea45c833d7b1ebdc8168	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-05 15:18:23.239	2026-09-06 03:08:16.423	2026-09-05 16:19:41.639	2026-09-05 15:08:16.430
a3227f7bb3e8b0c954b65c3131f9a36e3ba153f346f47188	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-05 16:24:30.505	2026-09-06 04:19:41.639	2026-09-05 17:33:37.862	2026-09-05 16:19:41.670
4449ff74f4f02b941b8ec4fde3131515b6b50aadec224c85	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-05 17:47:16.954	2026-09-06 05:33:37.862	2026-09-05 17:47:28.154	2026-09-05 17:33:37.963
20a9c0919117342325a07512597da847f19b27088ebee5ae	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-05 18:06:10.411	2026-09-06 05:55:55.227	2026-09-05 18:06:45.853	2026-09-05 17:55:55.235
c5fa3634cb7500230d3034a9bac46c41235764f6a6ef7de4	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-05 18:31:45.059	2026-09-06 06:13:47.188	2026-09-05 20:36:55.425	2026-09-05 18:13:47.242
ded1e5c5e4f991f0496afbacea4fd37627cada7a29eee0bf	7	COMPANY_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-05 19:40:02.417	2026-09-06 07:22:27.851	2026-09-06 01:59:52.786	2026-09-05 19:22:27.917
da96f144aa0414596e7652537d08ba255e022c88468587f2	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-05 20:44:53.225	2026-09-06 08:36:55.425	2026-09-05 21:02:50.313	2026-09-05 20:36:55.449
8446e875c21a65f1ff220af19f04a6eae317241b95caa2c5	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-05 21:50:27.528	2026-09-06 09:02:50.313	2026-09-05 21:50:45.068	2026-09-05 21:02:50.355
0bc647e35810ced71ed4fe7c2a50201c93bed9122948bc7d	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-05 21:58:44.624	2026-09-06 09:55:03.711	2026-09-05 21:58:50.888	2026-09-05 21:55:03.837
6a5dd01217cbf0ec4fd2fd50907f315b8450612bccd5d4b9	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-05 22:08:57.210	2026-09-06 09:59:49.339	2026-09-05 22:09:17.490	2026-09-05 21:59:49.402
cb99dc3de04a5df1916113a751c3a7db8ac7b0ffb38c81f6	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-05 22:09:34.802	2026-09-06 10:09:31.469	2026-09-05 22:10:33.897	2026-09-05 22:09:31.554
37542035d36e1dc5cae86ba32e5c062850eae2ecc649c69b	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-05 22:11:34.807	2026-09-06 10:11:34.070	2026-09-05 22:12:23.777	2026-09-05 22:11:34.079
41922447cc97dfded13332d110f6bd1e6f3224c3a242891b	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-05 22:19:53.689	2026-09-06 10:12:39.776	2026-09-05 22:20:17.122	2026-09-05 22:12:39.779
1d68b89e86d31b166c1893b2717b74759ec35acc7f72870b	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-05 22:33:49.524	2026-09-06 10:21:13.532	2026-09-05 22:34:25.165	2026-09-05 22:21:13.602
36a6c0421d9473cfc56ff6296103c204e91ae8e1ac5ebc87	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-05 22:51:01.862	2026-09-06 10:34:54.365	2026-09-05 22:51:29.762	2026-09-05 22:34:54.378
93a4a31a697da633ee57a68d71fdd580090127d7665562a8	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-05 23:08:25.876	2026-09-06 11:07:23.319	2026-09-05 23:08:53.821	2026-09-05 23:07:23.405
54b6a0262d15fde807f355692950a1ed7c72b9e4fb36d6a5	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-05 23:13:48.145	2026-09-06 11:10:53.634	2026-09-05 23:14:12.940	2026-09-05 23:10:53.755
45fe5516a42bf514bedafba15e93ebbe04dc8b723be2cf28	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-05 23:17:43.864	2026-09-06 11:17:42.332	2026-09-05 23:18:02.068	2026-09-05 23:17:42.358
c269c1f8f353efa07791df4932b3b1effed5622782caf68c	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-05 23:53:51.255	2026-09-06 11:21:08.478	2026-09-05 23:54:11.389	2026-09-05 23:21:08.495
52d6c6535d9a253c99a38f8c43fda3beb3b70c1fc3ac0604	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-05 23:58:55.193	2026-09-06 11:54:33.541	2026-09-05 23:59:24.249	2026-09-05 23:54:33.614
4213b14a93e84c7c7e28d3b3803c4e967e182df5578032b0	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-06 00:26:08.225	2026-09-06 12:25:05.547	2026-09-06 00:26:15.065	2026-09-06 00:25:05.606
0c95ea71858be4bed594ac870b88a05212f5a3301c3713fe	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-06 00:30:16.766	2026-09-06 12:30:15.546	2026-09-06 00:30:42.860	2026-09-06 00:30:15.565
4e13eed42bcc140cda98f4d212544b26eb4b5a56f0b0ee9e	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-06 00:37:19.733	2026-09-06 12:31:45.041	2026-09-06 00:37:59.533	2026-09-06 00:31:45.053
3b9ada669849cc7148ea06db53ebf85ceae03e6be22ca0d7	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-06 00:54:40.208	2026-09-06 12:53:38.905	2026-09-06 00:55:17.068	2026-09-06 00:53:38.959
982ca2bf14223cb2ed3f57a05827049c09931cef62f95211	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-06 01:07:10.580	2026-09-06 13:05:08.481	2026-09-06 01:07:46.163	2026-09-06 01:05:08.546
ed85d785832305e34e66649fc4117fad97715a5e80312389	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-06 01:09:22.215	2026-09-06 13:08:20.798	2026-09-06 01:10:15.220	2026-09-06 01:08:20.802
0a009322911f408e16fa274a2c814f7ae4bc39c17d7b22fd	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-06 01:17:32.860	2026-09-06 13:14:52.814	2026-09-06 01:17:42.516	2026-09-06 01:14:52.853
fee315494bdb429d1915b9898fe32bc35ea0d04b7b483942	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-06 01:17:46.473	2026-09-06 13:17:45.959	2026-09-06 01:18:33.619	2026-09-06 01:17:45.962
b6b5820401fde8756f510d35f14c059e296536a18c9ab79b	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-06 01:27:33.310	2026-09-06 13:27:22.141	2026-09-06 01:28:30.506	2026-09-06 01:27:22.146
44e50623894dd92337434dcd2e2a35547077f9f12572f2e0	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-06 01:29:36.986	2026-09-06 13:29:36.349	2026-09-06 01:29:55.331	2026-09-06 01:29:36.356
3b6a2ee71f4d5212d829dbab114a5f80133e30a29ef071e7	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-06 01:30:00.581	2026-09-06 13:29:59.927	2026-09-06 01:30:24.198	2026-09-06 01:29:59.934
ca791362aa2a0e1f78ec8da4f98634c8483cce5a3919c95e	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-06 01:42:24.560	2026-09-06 13:42:22.753	2026-09-06 01:42:57.802	2026-09-06 01:42:22.806
be6d885f816df3736327f6c30c160432d7bcec3275ab40d7	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-06 01:59:00.875	2026-09-06 13:47:22.487	2026-09-06 01:59:20.368	2026-09-06 01:47:22.536
15fa1784b4c4c18fd475f5b890fe66ff1f7cb33f6abea371	7	COMPANY_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-06 02:06:26.753	2026-09-06 13:59:52.786	2026-09-06 02:06:56.777	2026-09-06 01:59:52.845
b24008c14141d4c4d1981949979559fe98bb4f5c91a3ca7c	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-06 02:10:04.818	2026-09-06 14:07:02.766	2026-09-06 02:10:56.897	2026-09-06 02:07:02.815
acf8e2f113e1a0e80af70baf4ba1f70a12710dcd2bef6a51	15	COMPANY_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-06 02:11:47.008	2026-09-06 14:11:46.083	2026-09-06 02:12:10.627	2026-09-06 02:11:46.174
e968c3a1975234d0b2acdcbe9a220ae6ef1e26c979392e5e	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-06 02:22:34.778	2026-09-06 14:12:19.233	2026-09-06 02:22:43.925	2026-09-06 02:12:19.236
63f5739840cda7fb8fb0cebaa627d56b671b2a59e4842158	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-06 02:43:04.828	2026-09-06 14:22:43.925	2026-09-06 02:43:20.075	2026-09-06 02:22:44.026
05ae664892418ca9a42d1a334379af99600503f419132718	15	COMPANY_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-06 02:58:45.218	2026-09-06 14:43:24.083	2026-09-06 02:59:37.440	2026-09-06 02:43:24.143
a155ee16f54afef94156ee733118231f1b7c444eae04e7b8	6	COMPANY_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-06 03:04:32.216	2026-09-06 15:01:30.338	2026-09-06 03:04:52.012	2026-09-06 03:01:30.391
3449eeb4591c2b81157fc0d8050db831eedeab6170d532d1	6	COMPANY_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-06 03:05:03.358	2026-09-06 15:05:02.937	2026-09-06 03:05:31.688	2026-09-06 03:05:02.942
d93025c2b3e9e208ece0261f3b75cb4aaae92645f7539628	7	COMPANY_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-06 03:34:28.335	2026-09-06 15:05:59.425	2026-09-06 03:35:12.467	2026-09-06 03:05:59.430
2b3abc8e8f7c6a035b87b17fbbfb023985dbd4ca1b1cb924	7	COMPANY_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-06 03:41:37.575	2026-09-06 15:35:16.339	2026-09-06 03:41:42.592	2026-09-06 03:35:16.392
c31413fe4276e876978a8249b30b3fc93dbdc4e9e06c086f	6	COMPANY_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-06 03:41:50.010	2026-09-06 15:41:49.418	2026-09-06 10:20:28.233	2026-09-06 03:41:49.484
397dd770bc068859ba7ad35706a0ef3940ece0a27c780764	6	COMPANY_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-06 10:20:43.829	2026-09-06 22:20:28.233	2026-09-06 10:21:13.832	2026-09-06 10:20:28.251
d49c8a24d7015a132060f682217d976dc877b27b9f08ca10	7	COMPANY_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-06 10:22:20.915	2026-09-06 22:21:20.437	2026-09-06 10:22:58.683	2026-09-06 10:21:20.472
f96cc61d5796d183d40dc1b7a70038aacff7dd47b8917a12	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-06 10:33:55.307	2026-09-06 22:30:05.561	2026-09-06 10:33:58.737	2026-09-06 10:30:05.582
b2ae1dfc112143f9c65f673ea94f3bf892d2013474d3d2e2	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-06 10:34:43.160	2026-09-06 22:34:42.171	2026-09-06 10:34:52.856	2026-09-06 10:34:42.246
b3e8b1b463a00ee2db04edd61d03830b77e9f8d1e54ddbe0	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-06 10:47:26.570	2026-09-06 22:47:25.454	2026-09-06 10:47:45.174	2026-09-06 10:47:25.461
517631aaba9bfce77491f235bb6bad6c71f5926ccd15b2e8	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-06 10:56:22.380	2026-09-06 22:55:19.099	2026-09-06 10:56:56.160	2026-09-06 10:55:19.104
fc81996d589c4d8892207a3004d0239f3367ee08dd2fe2c7	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-06 11:09:59.234	2026-09-06 23:02:57.046	2026-09-06 11:10:09.302	2026-09-06 11:02:57.058
dbe95ab5dbdcb925ce419e31886aacdd60340a56708e8e40	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-06 11:12:53.228	2026-09-06 23:11:52.167	2026-09-06 11:12:58.992	2026-09-06 11:11:52.174
1039dd5fae9d2de9928afa15256d36cfc1cef65a414702a4	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-06 11:35:04.255	2026-09-06 23:12:58.992	2026-09-06 11:47:12.247	2026-09-06 11:12:58.999
f0a73577da116b6be28c7d7aa4a7d368afcd20ffb74f0522	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-06 11:51:30.599	2026-09-06 23:47:22.646	2026-09-06 11:52:20.846	2026-09-06 11:47:22.699
eb1d58c2b5a2ee4567e6fc8cedaaf82641cbcb218a2d30d6	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-06 13:34:15.027	2026-09-07 01:27:31.391	2026-09-06 13:34:52.905	2026-09-06 13:27:31.461
4ec21710ba0a91ead1ddb623a753b3f7f0d7c8c977278b72	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-06 13:44:51.898	2026-09-07 01:42:46.671	2026-09-06 13:44:51.915	2026-09-06 13:42:46.690
d220c820ec1ba0afe4374c82cf67462f247244fe43a9f06f	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-06 14:28:35.300	2026-09-07 02:22:33.130	2026-09-06 14:30:32.242	2026-09-06 14:22:33.151
553ef95d8dbae95c6c275a38bc405d200b670d958605da6e	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-06 15:06:57.087	2026-09-07 02:31:56.006	2026-09-06 16:30:45.496	2026-09-06 14:31:56.108
7d96d83b232a1bb434a8c1ab4f374a0404627bff8d0c7c8f	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-06 17:46:53.200	2026-09-07 05:15:20.230	2026-09-06 18:11:20.814	2026-09-06 17:15:20.266
fe1690da249f4629707972f5870d3fe5df6197c8423f854f	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-06 18:16:04.850	2026-09-07 06:11:24.999	2026-09-06 21:12:25.043	2026-09-06 18:11:25.012
12b48d3831f51bfbc75d7a4c6c09c11f17875010376b85cf	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-06 21:23:32.295	2026-09-07 09:12:25.043	2026-09-06 22:15:34.889	2026-09-06 21:12:25.050
499a8fd13f4f3f1c50f20b1290c5fa3299264a506aa2d43a	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-06 22:16:36.084	2026-09-07 10:15:34.889	2026-09-06 22:17:07.731	2026-09-06 22:15:34.984
e92aad4170b79c2c793ade987d83d0e819f3adb0dcd7c9b7	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-06 22:21:45.198	2026-09-07 10:17:43.886	2026-09-06 22:22:34.982	2026-09-06 22:17:43.889
2f9abc86eee882bfedc626e36f37bda2999911cbe7d97a2e	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-06 22:28:30.102	2026-09-07 10:25:29.289	2026-09-06 22:29:23.986	2026-09-06 22:25:29.293
51c995ef2cc2285e1c3a8267675b4f4ca05cda4dcdbd8a05	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-06 22:29:33.860	2026-09-07 10:29:33.308	2026-09-06 22:29:53.934	2026-09-06 22:29:33.312
191e00af2a5a5149293e876bc887d21973a77d8b9d075656	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-06 22:31:35.610	2026-09-07 10:31:34.798	2026-09-06 22:31:46.486	2026-09-06 22:31:34.809
d2d60f132030e5f92d067f5835c7f99953459856c2983d98	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-06 22:35:44.820	2026-09-07 10:33:41.624	2026-09-06 22:36:14.856	2026-09-06 22:33:41.651
dad73ada1e4774bc34a91134266e2f00717d52cb8e81a6f4	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-06 22:36:22.331	2026-09-07 10:36:21.494	2026-09-06 22:36:27.622	2026-09-06 22:36:21.498
5b597a848ab1dc71fda499d63600acc39c09070696040525	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-06 23:24:09.284	2026-09-07 11:19:01.899	2026-09-06 23:25:13.939	2026-09-06 23:19:01.903
9b36173a0a4d21401372198fc126f08845c0483b232bbc14	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-06 23:36:32.651	2026-09-07 11:27:13.058	2026-09-06 23:38:08.249	2026-09-06 23:27:13.065
7b5467bf28e4e2a194b585aa4d41c1c358a24c9bf77c1d89	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-06 23:55:17.320	2026-09-07 11:38:08.249	2026-09-06 23:56:32.286	2026-09-06 23:38:08.253
32778a9273caa858abf7d3dbca9db7f549d77d1771f61d1f	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-06 23:58:45.195	2026-09-07 11:57:44.684	2026-09-06 23:59:33.382	2026-09-06 23:57:44.688
537408a752728021d51655164c71b7d32b7836d5a69cfa9f	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-07 00:10:23.916	2026-09-07 11:59:33.382	2026-09-07 00:10:24.276	2026-09-06 23:59:33.386
137ffce8c86f84ff23cc68a15c7b441fd29d4697a2af6b83	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-07 00:11:45.779	2026-09-07 12:10:44.899	2026-09-07 00:12:00.764	2026-09-07 00:10:44.903
a23fe2b82bb39697bc7b8f1319de6f36913286989373d1d9	7	COMPANY_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-07 00:46:30.899	2026-09-07 12:46:21.450	2026-09-07 00:46:44.145	2026-09-07 00:46:21.457
8bfb16ffec36c936a9b95280bf67775a8eae760e0f1612c4	7	COMPANY_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-07 00:51:07.411	2026-09-07 12:47:05.667	2026-09-07 00:51:09.321	2026-09-07 00:47:05.671
edf8ef29d3733490a9aa08209267527204b3d061ea9ea21e	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-07 06:27:11.718	2026-09-07 18:27:10.332	2026-09-07 06:29:14.656	2026-09-07 06:27:10.349
6df1876db39da7b1eab73127c40d6fa9d25c3a961d410c41	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-07 06:33:16.494	2026-09-07 18:29:14.656	2026-09-07 06:34:12.014	2026-09-07 06:29:14.677
1ba5b387942a6a21ba9654f611c32dea57bd0af42da96885	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-07 06:43:08.100	2026-09-07 18:34:18.052	2026-09-07 06:43:57.456	2026-09-07 06:34:18.064
4735fedb84fb8de84d0b5557153d859145c093bf6492139f	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-07 06:54:42.216	2026-09-07 18:44:55.005	2026-09-07 07:02:29.638	2026-09-07 06:44:55.015
e64e8eb4fa9de49d2bb720462312cf2ecbea2a74697b1585	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-07 07:02:33.997	2026-09-07 19:02:32.937	2026-09-07 07:03:15.353	2026-09-07 07:02:32.943
dd5310e07214246ac85e525942d7a1748677ea0178d12a25	15	COMPANY_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-07 07:12:47.291	2026-09-07 19:05:18.641	2026-09-07 07:13:28.606	2026-09-07 07:05:18.646
72cab6fcbaae8d095970e0e5d411b685a17383c39574c7c6	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-07 07:17:35.314	2026-09-07 19:13:33.917	2026-09-07 07:18:07.002	2026-09-07 07:13:33.921
fb8210a98da988ac71c4f78ceacad53d1e71aede0d07beda	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-07 07:20:05.296	2026-09-07 19:20:04.454	2026-09-07 07:21:34.482	2026-09-07 07:20:04.459
9698db1e4c37692a21efbc6332bbbe4d305bd36e7a9333b4	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-07 07:22:38.571	2026-09-07 19:21:34.482	2026-09-07 07:22:53.628	2026-09-07 07:21:34.488
0a098d6ecdf4653a4bb50fd4eb19576384f170ae0043cf81	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-07 07:43:12.412	2026-09-07 19:41:10.743	2026-09-07 07:49:48.417	2026-09-07 07:41:10.752
93b3ef0fb729f4e9b4cf3011502cb466bb54a976b6909990	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-07 07:50:49.196	2026-09-07 19:49:48.417	2026-09-07 07:50:57.244	2026-09-07 07:49:48.423
209357d2a0ed70a8233124e3781a80f49a9ca47b69c129dd	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-07 07:58:57.297	2026-09-07 19:53:49.901	2026-09-07 07:59:18.009	2026-09-07 07:53:49.909
a4d2ebb7bac0c68dcd6a87c1ecd7c6d44356add9a22c0bb5	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-07 08:04:00.186	2026-09-07 20:00:36.180	2026-09-07 08:04:04.157	2026-09-07 08:00:36.185
69625ced06288f4c592123506c21c89e358c750849c41901	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-07 08:57:31.664	2026-09-07 20:51:31.534	2026-09-07 08:57:38.431	2026-09-07 08:51:31.541
21ddfd9224071863a9bf28e891880ffa2e131727409c12c8	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-07 08:58:35.612	2026-09-07 20:58:35.015	2026-09-07 08:58:55.878	2026-09-07 08:58:35.019
7ffb8d27255a16fae6d497d930ea076276f8ae5876e43d93	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-07 09:20:23.224	2026-09-07 21:00:25.935	2026-09-07 10:29:50.339	2026-09-07 09:00:25.937
5a4d2a0e87c0970c196e198609e4b6e70a6c6d64569bdfb1	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-07 15:00:38.191	2026-09-08 02:49:36.244	2026-09-07 15:07:03.172	2026-09-07 14:49:36.385
c6136f0b5d3141f1f5df4e8d5473b5e52492be790522dfc3	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-07 15:15:12.190	2026-09-08 03:10:10.820	2026-09-07 15:40:35.093	2026-09-07 15:10:10.824
f9a22eb019ce4fa27ff7c9a12accc3b6b81a25482a982a31	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-07 15:45:36.716	2026-09-08 03:40:35.093	2026-09-07 15:45:48.318	2026-09-07 15:40:35.112
616f8b5b427a60461e0b7f5b751398a12c24118b303472c4	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-07 17:02:24.179	2026-09-08 03:55:43.609	2026-09-07 17:03:19.695	2026-09-07 15:55:43.709
b2ffa0601a43c47108b6a941a84a40c94e06a768199a68f3	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-07 17:54:31.128	2026-09-08 05:52:16.779	2026-09-07 17:55:03.134	2026-09-07 17:52:16.798
4035ecd092f644d2c998330ee8fbb82d62eee8f1df013308	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-07 18:34:03.294	2026-09-08 05:55:03.134	2026-09-07 18:45:08.825	2026-09-07 17:55:03.138
a7c5d3498c7d0d4ed116561d71806adf3f8bf66fba56ad0a	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-07 18:55:24.269	2026-09-08 06:45:13.247	2026-09-07 18:56:24.222	2026-09-07 18:45:13.298
bd441227bc2b881659c2f02b89d103146684bbf9349acd00	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-07 19:29:16.326	2026-09-08 07:23:02.300	2026-09-07 19:36:46.561	2026-09-07 19:23:02.312
c2b4aa24b8e10d7a4b9c4e128fae4001f86a309aeea545f2	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-07 19:41:55.392	2026-09-08 07:37:06.912	2026-09-07 19:41:57.641	2026-09-07 19:37:06.958
1d709e84a38f3591c02cb9953758c57602f2b1df633bb7ec	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-07 19:42:37.114	2026-09-08 07:42:37.114	2026-09-07 19:42:53.221	2026-09-07 19:42:37.176
f8d144cc73aa84518295faf7374de3fd9a01d0b433820e70	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-07 19:42:53.221	2026-09-08 07:42:53.221	\N	2026-09-07 19:42:53.225
02e203660d4d7ccfcc58f6dc1c966ec3648ae6d9771f6982	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-07 19:48:29.933	2026-09-08 07:46:25.028	\N	2026-09-07 19:46:25.044
7c48e0788095f6c4ecf871b1d916953f6f5bc9ea9495ba84	15	COMPANY_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-07 19:46:44.046	2026-09-08 07:46:42.209	\N	2026-09-07 19:46:42.212
807bd5606a9f7040e77bdb27f995bde7446a33fc0e4e594d	15	COMPANY_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-07 19:47:04.003	2026-09-08 07:47:01.077	\N	2026-09-07 19:47:01.086
9f585f0991140e3e05095279056ee224635e49008bd785ca	15	COMPANY_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-07 19:47:12.324	2026-09-08 07:47:11.594	\N	2026-09-07 19:47:11.598
953970ee613092639770c27a422b6ae6ac79f865979a58dd	15	COMPANY_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-07 19:47:57.325	2026-09-08 07:47:56.188	\N	2026-09-07 19:47:56.288
665a92060df94f027c2caec51fbae3c47c6dedb8101e56e8	15	COMPANY_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-07 19:48:06.647	2026-09-08 07:48:04.925	\N	2026-09-07 19:48:04.928
bc27ae3f051394ed184cfb02645e3e45f6bf17041b88295a	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-07 19:49:44.301	2026-09-08 07:49:44.301	\N	2026-09-07 19:49:44.302
438336d825bf479af3ec115403466ba747b828fc42b21041	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-07 19:50:10.481	2026-09-08 07:50:06.063	\N	2026-09-07 19:50:06.066
c82674d725a0dbb75dc3e34ef3f01f1d17de031f606ac7a9	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-07 20:13:24.230	2026-09-08 07:50:58.317	2026-09-07 20:20:44.300	2026-09-07 19:50:58.320
11fab3f1bfce6163fb38817e29910f72b2f4ba6edf366282	15	COMPANY_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-07 19:52:06.091	2026-09-08 07:52:03.070	\N	2026-09-07 19:52:03.131
d1179801a9ca9aa2f1993da8ae516d5eb54f49d6f0dbb256	15	COMPANY_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-07 20:21:42.787	2026-09-08 07:52:15.589	2026-09-07 20:22:07.599	2026-09-07 19:52:15.594
7e03cbeb798f912907d01022761484ef08cadf62a02effd3	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-07 20:20:31.510	2026-09-08 08:15:44.426	\N	2026-09-07 20:15:44.435
fc9304650f33e833007f07446d1b6624942e591b50ab84ee	15	COMPANY_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-07 20:21:40.124	2026-09-08 08:20:55.415	\N	2026-09-07 20:20:55.420
7de5d57be442efe95fc823733b1f2ead4397976d52159d34	15	COMPANY_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-07 20:21:39.248	2026-09-08 08:21:39.248	\N	2026-09-07 20:21:39.252
f93946798249fa6f64894121d9aba50ca02f1c2fa5938222	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-07 20:23:17.017	2026-09-08 08:22:15.614	2026-09-07 20:23:53.435	2026-09-07 20:22:15.616
4336579cd7b243d85842e5a2ba35b52ae4cf200610f781be	15	COMPANY_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-07 20:30:51.172	2026-09-08 08:24:50.504	2026-09-07 20:44:11.543	2026-09-07 20:24:50.507
f389c234a4b9b5f752bca747d32a771d482a27499f0f3ecc	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-07 20:31:24.335	2026-09-08 08:26:20.095	2026-09-07 20:43:27.494	2026-09-07 20:26:20.098
f3f0148127ab12f9e813d6c88aef4924765681404b594288	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-07 20:59:43.633	2026-09-08 08:44:06.094	2026-09-07 21:00:22.834	2026-09-07 20:44:06.096
f304642194ff52e2786f4f1f33307fec9bf9e79091452b9a	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-07 21:32:57.425	2026-09-08 09:08:43.135	2026-09-07 21:32:59.919	2026-09-07 21:08:43.139
8a454e16528a57ff45f2c04a30ac505651210385afa8fa94	7	COMPANY_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-07 21:26:54.185	2026-09-08 09:16:59.779	2026-09-07 21:28:09.836	2026-09-07 21:16:59.782
5a13c4f3f533d027f031aa41076bd5b5c51753bdc8ca26c7	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-07 21:33:05.187	2026-09-08 09:32:02.772	\N	2026-09-07 21:32:02.776
af5dac01e754ecc5ef5b317c918dd0ae8ab7d0a0577167bf	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-07 21:36:57.184	2026-09-08 09:35:56.055	\N	2026-09-07 21:35:56.058
24c1816b03fb48a5f3e210ca5fb138035f6cda6e79b73e57	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-08 04:16:36.611	2026-09-08 15:48:21.570	\N	2026-09-08 03:48:21.581
38c7028eaaadb04fca3e39bf2064a21c1b4a1c117a61cfa1	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-08 04:39:01.131	2026-09-08 16:19:31.897	\N	2026-09-08 04:19:31.901
c7d15b4018a5e16b6dff4d8515f43948df09428f867d6c30	7	COMPANY_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-08 04:34:08.729	2026-09-08 16:34:05.929	2026-09-08 04:34:12.402	2026-09-08 04:34:05.932
12e4be1c18b3c307d511a6069181c197c3177c42e54b52cf	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-08 04:44:33.226	2026-09-08 16:41:59.866	2026-09-08 04:45:31.628	2026-09-08 04:41:59.869
76854a1a110c390f45c784eb23460158effb1938e8a8d08a	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-08 06:32:11.596	2026-09-08 18:19:10.646	2026-09-08 06:41:15.660	2026-09-08 06:19:10.650
5851f35ad2cea383e40cba088cd9c7613e30b5e904421e35	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-08 06:44:45.691	2026-09-08 18:44:44.617	2026-09-08 06:45:43.279	2026-09-08 06:44:44.620
0019e271a85204ffd3e23d1db90ef8e0533e0389b90b67a0	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-08 07:17:33.711	2026-09-08 18:48:38.813	\N	2026-09-08 06:48:38.816
fda3e5bd58868c2c024ef85a4979e4c8a10b0a43182f66e0	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-08 07:13:17.813	2026-09-08 19:12:52.388	2026-09-08 07:13:51.777	2026-09-08 07:12:52.392
ca97de28988a993be188255759825b3ed3f2c95c8fa3f714	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-08 07:18:23.460	2026-09-08 19:18:22.475	2026-09-08 07:18:46.570	2026-09-08 07:18:22.478
460716afbdf8416877705b3e0f28bec85582dbf2772c19af	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-08 07:18:42.604	2026-09-08 19:18:41.839	\N	2026-09-08 07:18:41.842
0f0eb2c10e2633dfdabdadf1772a06f895ad1f2923434027	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-08 07:25:10.583	2026-09-08 19:19:25.351	\N	2026-09-08 07:19:25.355
f2e362d612810d2424352f1855d44ef84df861a5a58d23cb	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-08 07:31:29.801	2026-09-08 19:26:46.496	2026-09-08 07:37:36.315	2026-09-08 07:26:46.500
6712d28200d52fea8fd6412325c7502ef5a2641dd49a2d85	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-08 08:03:51.211	2026-09-08 19:38:42.665	\N	2026-09-08 07:38:42.676
586d246b81ab95894dd0a9fd628415cc3cf0d574baa0adf8	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-08 08:27:55.993	2026-09-08 20:09:25.691	2026-09-08 08:28:01.155	2026-09-08 08:09:25.695
6b9d151be50c4410f47f1a3b443b10a68b00fde51ac1dbc5	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-08 08:34:03.330	2026-09-08 20:33:00.619	2026-09-08 08:36:26.427	2026-09-08 08:33:00.622
6e42e563cb647aeaac2488758f17509c811a8849add08e7c	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-08 08:40:08.241	2026-09-08 20:38:04.794	2026-09-08 08:40:20.758	2026-09-08 08:38:04.805
e8b572a8e5137a2069efc2668040bd9e0169fdaebe1fc7d0	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-08 08:48:06.220	2026-09-08 20:41:02.838	2026-09-08 08:54:21.321	2026-09-08 08:41:02.841
46d668404c6a10ea71a5f5c26b61f621845b12ad6d38f89a	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-08 09:13:12.107	2026-09-08 20:58:36.867	2026-09-08 09:13:41.138	2026-09-08 08:58:36.870
9fb1243dde479b23d8828951b719c796ae1eaccab475fdae	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-08 09:49:23.920	2026-09-08 21:20:31.564	2026-09-08 09:50:02.761	2026-09-08 09:20:31.566
b5f25caa15ca6ae18ae8746b8c04797849fe61f52a881ff2	7	COMPANY_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-08 10:06:43.273	2026-09-08 21:50:52.813	\N	2026-09-08 09:50:52.817
96c2f2688d3182d073479bdb16b45b2394e569019d55af9b	7	COMPANY_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-08 10:05:43.249	2026-09-08 22:03:41.954	2026-09-08 10:05:57.287	2026-09-08 10:03:41.958
00ba94d023be95957815caf3734736747cb24da930e0af8c	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-08 10:10:20.274	2026-09-08 22:05:18.885	\N	2026-09-08 10:05:18.888
0727ec3498b7b67dd988cd4bd73de471bcd44ae9968d0851	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-08 18:41:57.714	2026-09-09 05:09:19.448	2026-09-08 18:41:58.262	2026-09-08 17:09:19.453
7d5ed50eee8cc0ebe8658593345c7068670ed549b95195a9	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-08 21:34:14.403	2026-09-09 08:23:56.437	\N	2026-09-08 20:23:56.450
855dae774984191615d0910c49c5a08833ffd8ea0138b3ae	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-08 21:37:00.357	2026-09-09 09:27:54.844	2026-09-08 21:37:14.794	2026-09-08 21:27:54.851
33389603820d1690af9e891e7a3dfd85eb9621c4be909319	7	COMPANY_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-08 21:49:28.319	2026-09-09 09:32:06.104	\N	2026-09-08 21:32:06.106
a890afd9b14f813e10644e774b9a0c60c6c5877072801ca1	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-08 21:51:44.311	2026-09-09 09:38:29.308	2026-09-08 21:51:46.647	2026-09-08 21:38:29.311
3305e86131db092c4c99fa65a0767cf5e26e063d3979005d	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-08 21:54:07.042	2026-09-09 09:54:05.948	2026-09-08 21:54:11.721	2026-09-08 21:54:05.951
2402c165005ab6ee27fd4e92042f9342ae84ef244abc8af6	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-08 22:23:18.998	2026-09-09 09:58:44.905	\N	2026-09-08 21:58:44.908
36d01932dc07a65faf6c9ce99d82f1c95b203c436d226f99	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-08 22:41:48.376	2026-09-09 10:38:45.914	\N	2026-09-08 22:38:45.926
af2067aba8ab4c6718be4b056059db783f62a1559abc1931	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-08 22:43:51.961	2026-09-09 10:42:30.526	\N	2026-09-08 22:42:30.530
14292a9fe5a03257f55b4d9b8c45b42f7fee627769c26aca	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-08 22:50:38.372	2026-09-09 10:44:08.709	\N	2026-09-08 22:44:08.713
8cd116642032cbf2ddbd9da4fbf60d94f34aa6bb3c2f0f98	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-08 22:53:17.294	2026-09-09 10:50:40.455	\N	2026-09-08 22:50:40.459
614ef76830bb7ef6d3f23edab6707ee7ec7db13ec517d555	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-08 22:57:08.189	2026-09-09 10:53:17.473	2026-09-08 22:57:30.965	2026-09-08 22:53:17.477
dcac62543b2cef9f495a4d58655210d24ff48614094b90a5	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-08 23:04:27.357	2026-09-09 11:02:16.138	\N	2026-09-08 23:02:16.141
638fa9ea72a09901258891cd50bd36943c5cbffb82bdcb1f	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-08 23:09:07.369	2026-09-09 11:07:05.577	\N	2026-09-08 23:07:05.582
9906ea1ac18457e7719d45983b63edec39e15cdd836906f8	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-08 23:11:03.056	2026-09-09 11:11:01.913	\N	2026-09-08 23:11:01.916
5596bc568bf53e136c5be761ef2d8ef7e0aa42686bb40658	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-08 23:11:51.100	2026-09-09 11:11:50.196	\N	2026-09-08 23:11:50.199
3ce093225c30d6cd3596bc66989187e157034db1e357c696	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-08 23:16:25.991	2026-09-09 11:12:21.710	\N	2026-09-08 23:12:21.712
9dcaa82de5202635019c9f9899a62fc2cf60510c1ea2dac2	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-08 23:37:17.372	2026-09-09 11:17:33.482	2026-09-09 09:39:48.006	2026-09-08 23:17:33.485
daaf719e4f695b27d7d3482b8df245b91478532e90a95b5d	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-09 10:00:39.414	2026-09-09 21:44:37.887	\N	2026-09-09 09:44:37.894
f81cf9fa9083ff4de35bd9c0c89b4033ab8e60085f35868c	18	COMPANY_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-09 10:00:30.411	2026-09-09 21:56:25.440	2026-09-09 10:19:25.465	2026-09-09 09:56:25.444
27a0055228b46c886d5968210e3a0b6fdd78b5342b719140	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-09 10:21:59.795	2026-09-09 22:08:53.439	\N	2026-09-09 10:08:53.441
993c3dce4f9c6948f21f8e8a1c0a82adbbabfe3c407ab12d	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-09 10:48:28.396	2026-09-09 22:28:12.914	2026-09-09 10:50:14.411	2026-09-09 10:28:12.917
109b113953a6b4efeae6b02e89ffe7a823a4ce887c9fdda5	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-09 11:56:55.493	2026-09-09 23:56:54.350	\N	2026-09-09 11:56:54.353
d1f4fe15fbba512d436372183cc97ac7280cbe2f4a60c5d4	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-09 15:02:34.231	2026-09-10 02:56:30.900	\N	2026-09-09 14:56:30.913
410a553c43febfca4e68165069741bc4037690f2546a9276	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-09 15:03:00.762	2026-09-10 03:03:00.762	\N	2026-09-09 15:03:00.766
8110f8782d9e9c7fa5a8dd4fe2fdc16844c89fec7280498c	1	SUPER_ADMIN	dc48245976c0b33c00f9f386a819478f4ddf7d4b	2026-09-09 15:47:52.188	2026-09-10 03:30:09.615	2026-09-09 15:48:52.267	2026-09-09 15:30:09.623
5e3ea9ad7812293d9ac151723698d6b32c48b0701b49fdd0	1	SUPER_ADMIN	dc48245976c0b33c00f9f386a819478f4ddf7d4b	2026-09-09 15:49:51.657	2026-09-10 03:49:50.412	2026-09-09 15:49:57.126	2026-09-09 15:49:50.414
fd727a37c1fb0f82b518bfc630e607ce77f0f0fb04acea62	1	SUPER_ADMIN	dc48245976c0b33c00f9f386a819478f4ddf7d4b	2026-09-09 15:56:41.619	2026-09-10 03:55:23.963	\N	2026-09-09 15:55:23.964
6d010217946e693164b110566027361b3f7f89f324834bea	1	SUPER_ADMIN	dc48245976c0b33c00f9f386a819478f4ddf7d4b	2026-09-09 15:59:45.650	2026-09-10 03:57:30.010	\N	2026-09-09 15:57:30.011
a6fc2d1d7e8be23c3758611d95463c4222343dcbdfd1d631	1	SUPER_ADMIN	dc48245976c0b33c00f9f386a819478f4ddf7d4b	2026-09-09 16:57:33.961	2026-09-10 04:54:31.156	2026-09-09 17:04:48.533	2026-09-09 16:54:31.199
09c2fc453daf39a83f0f9b923731674711bec121d8366956	1	SUPER_ADMIN	dc48245976c0b33c00f9f386a819478f4ddf7d4b	2026-09-09 17:07:48.125	2026-09-10 05:02:13.719	\N	2026-09-09 17:02:13.724
593ca4b9748116990b0d43cec841df1b5de67af3d7144d5e	1	SUPER_ADMIN	dc48245976c0b33c00f9f386a819478f4ddf7d4b	2026-09-09 19:14:52.235	2026-09-10 07:04:51.119	2026-09-09 19:15:52.851	2026-09-09 19:04:51.139
d601311d2b3725364e057e4252788eb6bd459f39d887937b	1	SUPER_ADMIN	dc48245976c0b33c00f9f386a819478f4ddf7d4b	2026-09-09 19:38:19.040	2026-09-10 07:16:57.572	\N	2026-09-09 19:16:57.575
6abfe66ce5da9d59e37689c0b7b798c7bbb2793858af6292	1	SUPER_ADMIN	dc48245976c0b33c00f9f386a819478f4ddf7d4b	2026-09-09 19:37:52.229	2026-09-10 07:25:50.566	2026-09-09 19:38:52.331	2026-09-09 19:25:50.569
973b79f3758f98bf18b6e828ee2bcd785452cd709c3a72f7	1	SUPER_ADMIN	dc48245976c0b33c00f9f386a819478f4ddf7d4b	2026-09-09 20:20:52.245	2026-09-10 07:39:18.204	2026-09-09 20:21:52.450	2026-09-09 19:39:18.209
f1f1628acb6d824550157d3da4694fe4c22ed8437395a3c0	1	SUPER_ADMIN	dc48245976c0b33c00f9f386a819478f4ddf7d4b	2026-09-09 20:17:05.194	2026-09-10 07:48:40.570	\N	2026-09-09 19:48:40.573
560f90fee8aa645412f0cc9b5b068bcb8185aa90aff2f204	6	COMPANY_ADMIN	dc48245976c0b33c00f9f386a819478f4ddf7d4b	2026-09-09 20:16:49.294	2026-09-10 08:11:44.340	\N	2026-09-09 20:11:44.424
c7b319ba4c95714616d546a3760dd951dd778fecf46b8764	6	COMPANY_ADMIN	dc48245976c0b33c00f9f386a819478f4ddf7d4b	2026-09-09 20:35:32.340	2026-09-10 08:30:12.941	\N	2026-09-09 20:30:13.001
a426cc0d12cec887ba4d195dc304554c81ca2a11849ca002	6	COMPANY_ADMIN	dc48245976c0b33c00f9f386a819478f4ddf7d4b	2026-09-09 20:42:11.201	2026-09-10 08:36:41.649	\N	2026-09-09 20:36:41.653
dd842d4c1f5b28b27440c88177343bb99c690a4863cce6c2	6	COMPANY_ADMIN	dc48245976c0b33c00f9f386a819478f4ddf7d4b	2026-09-09 21:37:52.212	2026-09-10 09:13:30.418	\N	2026-09-09 21:13:30.438
ad9fa368dc5d8256bc1193a766e4ca84217121057117a318	1	SUPER_ADMIN	dc48245976c0b33c00f9f386a819478f4ddf7d4b	2026-09-09 21:24:28.215	2026-09-10 09:22:25.561	\N	2026-09-09 21:22:25.564
7005bac6f194d73afc969c0ff05e3b28b1deac2d8e502cb0	1	SUPER_ADMIN	dc48245976c0b33c00f9f386a819478f4ddf7d4b	2026-09-09 21:55:52.358	2026-09-10 09:30:19.083	2026-09-09 21:56:52.374	2026-09-09 21:30:19.087
342e33180c7ec4f0617ca5ed16a61d46f6d20eed05d916a8	1	SUPER_ADMIN	dc48245976c0b33c00f9f386a819478f4ddf7d4b	2026-09-10 00:25:21.675	2026-09-10 12:01:25.407	\N	2026-09-10 00:01:25.418
f06efb1c8358b65d4e87724e49af4c9dbe049991f4d019c0	1	SUPER_ADMIN	0e3fecd0a84c748dd5395e5a7238776a42c18d73	2026-09-10 00:20:08.863	2026-09-10 12:20:08.863	\N	2026-09-10 00:20:08.877
522047187621e970d9531c7c20406090a8cac2b7d04b58a6	1	SUPER_ADMIN	dc48245976c0b33c00f9f386a819478f4ddf7d4b	2026-09-10 00:45:52.231	2026-09-10 12:27:33.653	2026-09-10 00:46:52.332	2026-09-10 00:27:33.736
9e276591e24a31d1fcc62d025db99f08ad17e0218b5de161	7	COMPANY_ADMIN	dc48245976c0b33c00f9f386a819478f4ddf7d4b	2026-09-10 00:38:43.325	2026-09-10 12:34:40.430	\N	2026-09-10 00:34:40.433
c13f31b80d3e1b3e5f89ade306188bf449748307747ca42b	1	SUPER_ADMIN	dc48245976c0b33c00f9f386a819478f4ddf7d4b	2026-09-10 01:14:29.223	2026-09-10 13:02:30.116	2026-09-10 01:17:06.754	2026-09-10 01:02:30.171
85ae2381aad614103016b18bdcdd844ea139c463a570b080	16	COMPANY_ADMIN	dc48245976c0b33c00f9f386a819478f4ddf7d4b	2026-09-10 01:15:45.024	2026-09-10 13:13:43.226	2026-09-10 01:16:30.619	2026-09-10 01:13:43.229
fe54c6c11edb333e289bc959ee7153dd4234e6ffd956417a	16	COMPANY_ADMIN	dc48245976c0b33c00f9f386a819478f4ddf7d4b	2026-09-10 01:18:40.213	2026-09-10 13:16:39.378	\N	2026-09-10 01:16:39.381
f6002b0b9cce45f424e0dcd541a34d27a353b4692f986186	1	SUPER_ADMIN	dc48245976c0b33c00f9f386a819478f4ddf7d4b	2026-09-10 01:37:52.268	2026-09-10 13:17:14.013	2026-09-10 01:38:52.460	2026-09-10 01:17:14.021
32511e535634858a3492d90168bbcffdac6633fc6b1b4049	1	SUPER_ADMIN	dc48245976c0b33c00f9f386a819478f4ddf7d4b	2026-09-10 15:26:44.199	2026-09-11 03:10:59.074	2026-09-10 15:27:43.668	2026-09-10 15:10:59.139
30fafc499511f07b61368373e8c9fdc52cd8d81925a81a24	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-10 18:49:43.627	2026-09-11 06:23:53.763	2026-09-10 18:50:43.523	2026-09-10 18:23:53.777
5a377d0b65fbca2e20d91136768e569f9898fef71a79cf7d	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-10 18:58:56.623	2026-09-11 06:53:54.277	2026-09-10 19:18:12.798	2026-09-10 18:53:54.280
dceb56a4c607f9a42a7a4ab150584098e5fc64a9ba92348e	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-10 20:38:43.187	2026-09-11 07:32:46.722	\N	2026-09-10 19:32:46.730
29ed36861edc2645822f54beab57d46b1542907ee710bfc4	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-10 20:37:43.535	2026-09-11 08:28:17.111	2026-09-10 20:38:43.707	2026-09-10 20:28:17.114
45c1ce47038986a55949e3460390927cf7d8b3271dae7254	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-10 20:49:21.529	2026-09-11 08:38:53.591	\N	2026-09-10 20:38:53.595
511540fa816d4d95f2c854373d7ad3f2d8d3fd70769637fa	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-10 21:01:43.521	2026-09-11 08:45:07.215	2026-09-10 21:37:46.773	2026-09-10 20:45:07.219
77428e188e96c5dcd23266d570f0cbed4ca19e423cb0a012	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-10 21:15:57.300	2026-09-11 09:11:57.816	\N	2026-09-10 21:11:57.831
9d9ad735f76a8079a2970c17914a741702471531d0db92f1	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-10 21:21:43.358	2026-09-11 09:20:12.968	\N	2026-09-10 21:20:12.971
6f4f080d8e41dc9b72ff6b1c3c00d75247a77974f761c0f5	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-10 21:35:18.406	2026-09-11 09:22:41.068	2026-09-10 21:36:14.432	2026-09-10 21:22:41.071
130a19356f5bbf17f35d9df2ad8a3293f455cf6e2ccc2171	7	COMPANY_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-10 21:37:48.509	2026-09-11 09:36:45.387	\N	2026-09-10 21:36:45.390
515eaf1c5a70715ac751fef1f8eebfe8451058688acaa3ae	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-10 21:37:51.569	2026-09-11 09:37:51.569	\N	2026-09-10 21:37:51.577
974d56b6ff2e5016455f509dc19c70bbd7af4b0362d72c28	1	SUPER_ADMIN	dc48245976c0b33c00f9f386a819478f4ddf7d4b	2026-09-10 22:30:43.500	2026-09-11 09:43:58.711	2026-09-10 22:31:43.639	2026-09-10 21:43:58.731
19903cbfcd7e770d9296ab48a85270e9b954115ca3cc616e	1	SUPER_ADMIN	dc48245976c0b33c00f9f386a819478f4ddf7d4b	2026-09-10 22:52:43.559	2026-09-11 10:39:41.779	2026-09-10 22:54:26.278	2026-09-10 22:39:41.794
08e78cadb7d56b9a25b21bdb2e50bdcfb3cace00e9e72b2f	1	SUPER_ADMIN	dc48245976c0b33c00f9f386a819478f4ddf7d4b	2026-09-11 08:38:35.704	2026-09-11 19:54:24.588	2026-09-11 08:39:36.158	2026-09-11 07:54:24.643
dfaa9f13ce75083236a683bbfb3a0d4349e6726dfdea8485	1	SUPER_ADMIN	dc48245976c0b33c00f9f386a819478f4ddf7d4b	2026-09-11 13:51:05.843	2026-09-12 01:51:01.242	\N	2026-09-11 13:51:01.257
cf2157081354b1945e70fb391f3e1c7c7b387ba03a3c3187	1	SUPER_ADMIN	dc48245976c0b33c00f9f386a819478f4ddf7d4b	2026-09-11 13:53:59.713	2026-09-12 01:51:58.146	\N	2026-09-11 13:51:58.149
6de2ae96db5139fd6e3dee017d0396964efc07d4e8dd95e2	1	SUPER_ADMIN	dc48245976c0b33c00f9f386a819478f4ddf7d4b	2026-09-11 14:59:10.046	2026-09-12 02:23:17.206	\N	2026-09-11 14:23:17.210
fd9b7af27078a6d5d69961ecfd25b617248460f4bbc97b31	7	COMPANY_ADMIN	dc48245976c0b33c00f9f386a819478f4ddf7d4b	2026-09-11 14:46:29.647	2026-09-12 02:46:17.280	2026-09-11 14:46:42.049	2026-09-11 14:46:17.354
d04f92c0aca92574d68dcdee47a38ec2558aba6db8869d13	1	SUPER_ADMIN	51816c393a1fd7b7023b69e2a8c6f34612495bb1	2026-09-11 14:55:14.793	2026-09-12 02:50:23.217	\N	2026-09-11 14:50:23.220
e824185f6cfd481a7190da502d5f13f523f9c3f2bc6181ed	1	SUPER_ADMIN	dc48245976c0b33c00f9f386a819478f4ddf7d4b	2026-09-11 15:24:35.847	2026-09-12 03:00:56.617	2026-09-11 15:25:35.957	2026-09-11 15:00:56.672
00d69d6bafe15b9e8158556bde4c021e35bb70e0a4726a54	1	SUPER_ADMIN	ae6ae55a52f1a7f612d24c2384333837f9027aee	2026-09-11 23:27:44.603	2026-09-12 11:23:21.379	\N	2026-09-11 23:23:21.384
6aac07ff67d7c1423f8ba62feabe03711db8e5aa80c2927e	1	SUPER_ADMIN	dc48245976c0b33c00f9f386a819478f4ddf7d4b	2026-09-12 15:52:40.551	2026-09-13 03:31:18.355	2026-09-12 15:53:40.614	2026-09-12 15:31:18.367
de4b4cf94e32387480c0daf85719690d68776cf8d3a760fb	1	SUPER_ADMIN	dc48245976c0b33c00f9f386a819478f4ddf7d4b	2026-09-12 20:21:40.536	2026-09-13 08:13:58.958	\N	2026-09-12 20:13:58.969
023fe817e998bff4525a6cff444ac566d0e907f89ee9c705	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-13 06:20:54.994	2026-09-13 17:33:13.437	2026-09-13 06:25:11.556	2026-09-13 05:33:13.458
9710dbfa808b1986eb7eb1f80ad50322808094088c178471	7	COMPANY_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-13 05:59:11.541	2026-09-13 17:52:57.727	\N	2026-09-13 05:52:57.731
a0b740f97d36f44cb8867cea20703429da31b7bd2ab09015	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-13 06:25:20.391	2026-09-13 18:25:20.391	\N	2026-09-13 06:25:20.433
e63ce08cec5073af24ce6d8fe68f5bcf39e1792ca0bad896	1	SUPER_ADMIN	dc48245976c0b33c00f9f386a819478f4ddf7d4b	2026-09-13 06:59:40.653	2026-09-13 18:25:34.645	2026-09-13 07:01:40.703	2026-09-13 06:25:34.649
f9c41d02f823298a49131c05790cdf8d18011b3721f6422c	7	COMPANY_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-13 07:52:17.153	2026-09-13 19:51:15.469	\N	2026-09-13 07:51:15.483
0bb1ffb6420a582186e42e2b8ffb38779aa940d7886a8fd3	7	COMPANY_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-13 07:53:00.460	2026-09-13 19:52:58.479	2026-09-13 07:53:52.207	2026-09-13 07:52:58.486
eea4a2f415b50b855a43c8ea9edde8c498ca99f16f4a490b	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-13 08:06:40.673	2026-09-13 19:57:24.359	2026-09-13 08:07:40.542	2026-09-13 07:57:24.366
d0c50f17dacb0e9aa3eadc45644748cc8275dd326b9759f2	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-15 14:35:24.448	2026-09-16 02:23:14.724	\N	2026-09-15 14:23:14.731
78b2436abed1a2acec17cac49156fc918d8e66ee23b2e4cd	7	COMPANY_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-15 14:44:59.293	2026-09-16 02:44:57.145	2026-09-15 14:45:48.909	2026-09-15 14:44:57.167
81fadf8664fd4572d800033f80c62eee120dc69c05da15fb	15	COMPANY_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-15 14:47:07.872	2026-09-16 02:46:06.918	2026-09-15 14:47:42.830	2026-09-15 14:46:06.921
44ba29f36e27d2d50ce3facbb4ee300a99cf9e510627830a	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-15 14:47:20.421	2026-09-16 02:47:18.849	2026-09-15 14:47:25.005	2026-09-15 14:47:18.853
83aeab741c209b682ac589ea98355273b7e28a3876ff0c11	6	COMPANY_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-15 14:51:08.904	2026-09-16 02:48:08.119	\N	2026-09-15 14:48:08.122
0586f4653b2ec2e043370955431b9ab2bc49bee71ef1f8bc	6	COMPANY_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-15 14:53:08.911	2026-09-16 02:51:54.258	2026-09-15 14:53:11.427	2026-09-15 14:51:54.261
fd8c4afc8ad85a9fe6ebd32edecd5ddcefe0f1fd39a5a509	16	COMPANY_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-15 14:53:22.894	2026-09-16 02:53:22.215	2026-09-15 14:53:29.380	2026-09-15 14:53:22.217
14f563bce2f12f76f1dd4e1fdfa198c825eda97718ed1d57	16	COMPANY_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-15 14:58:23.881	2026-09-16 02:53:52.048	2026-09-15 14:58:56.926	2026-09-15 14:53:52.051
34a8535aa807df6c8319464ba2c44dc835f6ca1723cd6761	19	COMPANY_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-15 15:07:23.876	2026-09-16 03:00:16.867	2026-09-15 15:07:38.652	2026-09-15 15:00:16.869
88e82e4fd49d5f95fac50d269cbaddf20dbe7a25c7d9d9e0	7	COMPANY_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-15 15:09:30.581	2026-09-16 03:08:29.959	2026-09-15 15:10:07.497	2026-09-15 15:08:29.963
bdebb559fee16713cea79d5dfb060377424d7c7dc684006a	18	COMPANY_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-15 15:15:29.980	2026-09-16 03:10:29.217	2026-09-15 15:16:16.832	2026-09-15 15:10:29.220
4a0831b25dd6f7cfd925aa6a77248e7761c08915b867c8c1	18	COMPANY_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-15 15:44:23.877	2026-09-16 03:19:15.688	2026-09-15 15:45:06.941	2026-09-15 15:19:15.691
5af5415efedc3463fdd48a073dc3eaf2f025492e983b5354	18	COMPANY_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-15 15:57:48.277	2026-09-16 03:57:44.203	2026-09-15 15:58:13.177	2026-09-15 15:57:44.222
d41335b003c59c84eed781bcd1c76822e6da76f0fc8f7519	16	COMPANY_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-15 15:58:34.737	2026-09-16 03:58:33.474	2026-09-15 15:58:58.952	2026-09-15 15:58:33.487
8097188af3412def83f034e4af22b4a730d3d3e429de272f	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-15 16:10:14.342	2026-09-16 03:59:05.759	2026-09-15 16:11:24.060	2026-09-15 15:59:05.791
48f5d2b49c7a476081e60b2a773d08b339ea8668194fd91a	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-15 17:19:31.488	2026-09-16 05:14:33.614	2026-09-15 17:42:46.146	2026-09-15 17:14:33.620
7445f82b3565b479c91076ae57db561fe32183c516ec3826	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-17 06:31:19.037	2026-09-17 18:30:16.243	2026-09-17 07:16:32.222	2026-09-17 06:30:16.248
c535ba32ba4c320a4b17f6bb4f006c015c0106f49516f573	16	COMPANY_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-17 06:31:19.331	2026-09-17 18:31:18.082	2026-09-17 06:31:32.248	2026-09-17 06:31:18.086
35343fc61d7b2256a5dfd7425cc38873fbe8432f15415b05	19	COMPANY_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-17 06:31:40.647	2026-09-17 18:31:40.018	2026-09-17 06:31:57.446	2026-09-17 06:31:40.021
4266806173de340ac14461bdea395341d1ed2de46852e46f	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-17 07:40:56.026	2026-09-17 19:23:15.926	2026-09-17 07:41:56.037	2026-09-17 07:23:15.929
59b5eba9909c40477ca04acfd0112886c7bcac78e8c04097	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-17 07:45:47.165	2026-09-17 19:45:46.330	2026-09-17 08:57:35.507	2026-09-17 07:45:46.333
ac4dfab47f770b7fc5c8321a73308e7d682ce4244bf68e5f	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-17 08:58:50.460	2026-09-17 20:57:49.461	2026-09-17 08:59:13.203	2026-09-17 08:57:49.463
7146ab22dabfaa8a7a765827876669bac3a3608b736ba991	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-17 09:15:17.829	2026-09-17 20:59:55.069	2026-09-17 10:09:13.776	2026-09-17 08:59:55.072
9b8f76d393aa20ed847dcf614a7493af4807649df9a7ef62	19	COMPANY_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-17 09:05:04.152	2026-09-17 21:05:03.395	2026-09-17 09:05:58.878	2026-09-17 09:05:03.398
331c497b75a3e1338975dc190c0b996ce54a98ccf17fbf3c	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-17 10:17:50.134	2026-09-17 22:13:24.572	\N	2026-09-17 10:13:24.576
2d097d74098e47199d5c423126a3d3e25e01e2cac306f9bd	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-17 10:18:00.238	2026-09-17 22:17:59.231	\N	2026-09-17 10:17:59.234
2d5d861640fedb765490e9ef3dc8495ec2c20b44ae95644f	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-17 10:22:32.034	2026-09-17 22:18:30.899	2026-09-17 10:23:10.148	2026-09-17 10:18:30.910
ccd0024170596f0e5975706b25e274a25569343266434a29	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-17 10:49:21.991	2026-09-17 22:23:13.130	2026-09-17 10:50:21.980	2026-09-17 10:23:13.132
a892e675011bc0245e0b0cbd8d72957b94431a24e9b14c58	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-17 10:58:38.994	2026-09-17 22:53:40.519	2026-09-17 11:17:44.376	2026-09-17 10:53:40.523
72980f3c92d4bc794c4edef6a7bec008a77741f82bbf0690	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-17 11:58:48.039	2026-09-17 23:27:31.314	2026-09-17 12:07:29.506	2026-09-17 11:27:31.320
64a07a3535a4e7f558e4c13e16769eadcac2a463a76ccb4b	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-17 12:25:15.003	2026-09-18 00:07:34.216	\N	2026-09-17 12:07:34.232
238474aa832876250fc4fdc6f8612813d4bf2b255bf8938b	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-17 13:16:15.008	2026-09-18 01:04:19.203	\N	2026-09-17 13:04:19.208
438d59a2c09d12335e109b9f8cb06e39aab14507f811d568	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-19 06:47:16.043	2026-09-19 18:47:12.311	2026-09-19 06:59:25.003	2026-09-19 06:47:12.316
d15b33e4b14bb1dcfc9af5e3128e79eacfb83abf896c699b	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-19 07:06:54.249	2026-09-19 19:04:52.919	2026-09-19 07:07:04.320	2026-09-19 07:04:52.924
10aed938cf24ca1b5d52b52a2d4382da6d0b5d24fac6350d	15	COMPANY_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-19 07:20:31.245	2026-09-19 19:07:34.201	2026-09-19 07:21:18.292	2026-09-19 07:07:34.203
b93a65c583b1a4a34028712fea16a00a76c086e43d68aabf	15	COMPANY_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-19 07:24:57.233	2026-09-19 19:23:55.722	2026-09-19 07:25:28.754	2026-09-19 07:23:55.726
128c040c7108634273fc46738f3a635e321de7006e739b4c	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-19 07:27:19.488	2026-09-19 19:27:17.259	2026-09-19 07:47:07.186	2026-09-19 07:27:17.265
22609b5562d633f9b0b0481f834d4dbac8c4dd8202aaa8cf	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-20 19:47:29.866	2026-09-21 07:00:08.912	2026-09-20 19:54:41.918	2026-09-20 19:00:08.924
9760012194aa10ab271d002146b85cfc511e9707a9c824b5	15	COMPANY_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-20 19:31:29.870	2026-09-21 07:17:28.228	2026-09-20 19:43:47.275	2026-09-20 19:17:28.231
e27a098cf3edf7fbc1693a81f4350f9c41213fbbc0b2e4c6	15	COMPANY_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-20 20:02:29.867	2026-09-21 07:55:02.834	\N	2026-09-20 19:55:02.837
4b7849f53b74c3d3b6e912422b73dede71e0e8822a6cda7e	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-21 07:33:04.830	2026-09-21 19:12:13.318	2026-09-21 07:33:04.834	2026-09-21 07:12:13.340
179d6698fd9c32c71adddad571f2966fd77485f31d65aaef	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-21 07:49:24.661	2026-09-21 19:33:08.136	2026-09-21 14:40:16.513	2026-09-21 07:33:08.139
55150851dc14bdefc3de3c4dc1c2aa536e9a0f2c0298abd3	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-21 16:23:34.704	2026-09-22 03:55:36.998	\N	2026-09-21 15:55:37.003
682256deba8b3a97d67a29e20cb05fd7f5b5132e302d3650	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-21 16:35:19.722	2026-09-22 04:24:18.387	2026-09-21 16:35:24.723	2026-09-21 16:24:18.409
b8be40ac93f9a253d3f318e1cb03b713a576a38b4374d6c9	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-21 17:04:35.653	2026-09-22 04:35:51.784	2026-09-21 17:05:07.790	2026-09-21 16:35:51.788
9f0a8cc0be0adbe3c47fb0ebd0109cb131ff7a4a5c1397cd	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-21 17:52:24.678	2026-09-22 05:35:12.413	\N	2026-09-21 17:35:12.423
f8ea54ffb7ca22954ce3e3e281a37d672e58a5c9137c11ce	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-22 10:52:12.239	2026-09-22 22:40:28.721	2026-09-22 11:46:24.025	2026-09-22 10:40:28.734
bcc351a076b895ac8edf8901e4676c462236e36c3759a7fb	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-22 13:00:12.220	2026-09-23 00:41:53.327	\N	2026-09-22 12:41:53.366
4b110d392dc42de5a1381db9658f1145be6b13a4bbc2901e	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-22 13:23:12.218	2026-09-23 01:09:17.055	\N	2026-09-22 13:09:17.078
65a0ecdea1fb9a4343ab0a97f9dfa6e7fe5bf056fb845df5	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-22 14:38:12.203	2026-09-23 01:52:12.015	2026-09-22 14:39:03.662	2026-09-22 13:52:12.021
3aaa0103072ec12528f0ce431a7f44b75129cdd220f05dab	1	SUPER_ADMIN	51816c393a1fd7b7023b69e2a8c6f34612495bb1	2026-09-22 14:04:23.270	2026-09-23 01:53:55.311	2026-09-22 14:05:00.528	2026-09-22 13:53:55.314
effd5ed348dacffbf199d527557346dca5cf04ba55112ef4	15	COMPANY_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-22 14:49:51.266	2026-09-23 02:39:09.494	\N	2026-09-22 14:39:09.511
480319f029a71e13d605dea3a834ba110a5286f74c451dd5	6	COMPANY_ADMIN	51816c393a1fd7b7023b69e2a8c6f34612495bb1	2026-09-22 15:04:10.870	2026-09-23 02:48:58.864	2026-09-22 15:27:05.640	2026-09-22 14:48:59.026
2fc54bf5dab661d0b4fefc636f2ed94f8921afe8db3833f2	15	COMPANY_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-22 14:53:01.931	2026-09-23 02:50:33.042	2026-09-22 14:54:55.869	2026-09-22 14:50:33.045
82a650e0958f4c6d2391168c16d2fae6c292ea726f7650da	15	COMPANY_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-22 15:03:12.441	2026-09-23 02:55:00.328	2026-09-22 15:27:06.369	2026-09-22 14:55:00.341
3770391c58a156c9f337e7d69d0036f7ba7acf35a6fe57c7	15	COMPANY_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-22 15:53:15.188	2026-09-23 03:39:20.268	2026-09-22 15:54:37.913	2026-09-22 15:39:20.287
bedfc4f71fe711ed3b011d9c55662bf284790779a8dd7205	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-22 15:52:28.927	2026-09-23 03:41:13.502	2026-09-22 15:52:35.400	2026-09-22 15:41:13.505
1670564f6c2533e8a20f07c5ac94c090331588fe036f51f8	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-22 16:10:12.223	2026-09-23 03:52:39.183	\N	2026-09-22 15:52:39.197
cbde17418fc38025c18c8af547ab7e39421811b5835c4cdf	15	COMPANY_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-22 16:24:14.746	2026-09-23 04:23:30.524	2026-09-22 16:24:32.077	2026-09-22 16:23:30.529
7997aae6fc6aa8fb57e85bf4991470a4d31912c5486d3035	15	COMPANY_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-22 16:33:02.637	2026-09-23 04:25:01.927	2026-09-22 16:33:47.759	2026-09-22 16:25:01.930
42e014660ef2c32909e46150abbe41329149ee6645636d8f	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-22 16:44:12.252	2026-09-23 04:33:53.876	2026-09-22 16:45:12.316	2026-09-22 16:33:53.881
e6644051acdb07aaf108e7a7839c81a71f34ee0e87daa487	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-22 17:34:10.586	2026-09-23 05:34:08.816	2026-09-22 17:36:48.662	2026-09-22 17:34:08.822
46f3e08be98d51bfa742a6721bb1483a4ee60fb5704ea8ac	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-22 17:57:39.897	2026-09-23 05:47:26.458	\N	2026-09-22 17:47:26.461
6aa4f2c522243e9750e33e9bf48584de318c71b0f94a524c	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-22 18:30:35.817	2026-09-23 06:26:34.310	2026-09-22 18:30:44.822	2026-09-22 18:26:34.332
c266f3bf1f1d9d053b2d0876395ffd61265f96cb6cc0714f	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-22 18:35:09.305	2026-09-23 06:31:18.780	2026-09-22 18:35:55.754	2026-09-22 18:31:18.783
3527ec3bf91b3b22715e60a87791065cd7e47a1a60641db9	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-22 19:02:23.304	2026-09-23 06:36:33.370	2026-09-22 19:03:04.120	2026-09-22 18:36:33.398
ace46430607aaee7c8dfdf56711da02243b5ac1c44ddd0f8	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-22 19:10:15.205	2026-09-23 07:06:13.215	\N	2026-09-22 19:06:13.219
eaefd4b2b46d5b9926fc91b65cd68404e475fb35ba0d0035	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-22 19:23:52.210	2026-09-23 07:10:51.224	2026-09-22 19:24:12.310	2026-09-22 19:10:51.228
289a70ec7080ba21189765fc93b2eb1b6e7ebffed8fb8dd5	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-22 19:55:12.218	2026-09-23 07:24:17.639	2026-09-22 19:56:12.326	2026-09-22 19:24:17.641
99b8945e7a2db75e2ad6c801b7f38feb512a2071da44f359	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-22 20:06:06.259	2026-09-23 07:58:24.755	2026-09-22 20:23:55.271	2026-09-22 19:58:24.778
866a12ba728b99c148f22a4d85c0ebba8d557d10b2bb33b2	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-22 20:36:06.553	2026-09-23 08:23:59.237	2026-09-22 20:40:03.375	2026-09-22 20:23:59.259
3ae63fa633068ebfee9b05af563586b8730ea8bf185bc37b	19	COMPANY_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-22 20:43:47.389	2026-09-23 08:36:39.523	\N	2026-09-22 20:36:39.545
e1f2b6603f47d3669dd03fe944f1c9d49b8299408e8f9d17	16	COMPANY_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-22 20:52:22.132	2026-09-23 08:44:12.624	2026-09-22 20:52:31.206	2026-09-22 20:44:12.628
88281e56ed145f208b0ddeaf9fec4bc98da44c289929b9bf	16	COMPANY_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-22 21:56:25.898	2026-09-23 09:04:48.951	\N	2026-09-22 21:04:48.976
899d70e72615130817cf8741449c4bd7ea76d1442edde537	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-22 22:01:20.125	2026-09-23 10:00:17.989	\N	2026-09-22 22:00:17.994
a573ebb5e404f3289222557282baae6ee0b10e4b6eec5b44	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-22 22:07:21.261	2026-09-23 10:07:19.580	\N	2026-09-22 22:07:19.582
7d6730f165476ac86e296543c883932d74dbeae7eca67e8b	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-22 22:13:59.194	2026-09-23 10:07:57.706	2026-09-22 22:18:59.892	2026-09-22 22:07:57.709
17de3991bf5ac42199fbc59a1e66e8f68eab7b11b610f5c7	19	COMPANY_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-22 22:15:40.191	2026-09-23 10:13:38.537	\N	2026-09-22 22:13:38.539
afa1cc501cce6cb2cef4071fcefec11e96d8607ca91f801d	16	COMPANY_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-22 22:15:47.289	2026-09-23 10:15:45.976	\N	2026-09-22 22:15:45.980
3168e024335c6d58b94ddeec1aa0d162bc1d76c12cc1b155	15	COMPANY_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-22 22:16:05.235	2026-09-23 10:16:04.241	2026-09-22 22:16:16.609	2026-09-22 22:16:04.249
018dd9013eed88ea4477ab0eb378474073ad2aef99b40c72	6	COMPANY_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-22 22:16:40.220	2026-09-23 10:16:23.479	2026-09-22 22:16:43.146	2026-09-22 22:16:23.482
fc2ed50681e6d613ddc93e24ede7378fc81d3920d59c02e2	7	COMPANY_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-22 22:17:06.871	2026-09-23 10:17:06.311	2026-09-22 22:17:09.997	2026-09-22 22:17:06.313
8da38f390e34b0cff8d7fe5afd40dd8160bd895e2a1aa235	18	COMPANY_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-22 22:17:49.001	2026-09-23 10:17:48.652	\N	2026-09-22 22:17:48.654
b72ab44fe14cf9c98b7a6e2dc8917b126cbc91e6cb5738f3	18	COMPANY_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-22 22:18:01.830	2026-09-23 10:18:00.915	\N	2026-09-22 22:18:00.917
a1129dc51f2c4fe11ade2202819f697857edf5cfd58080b1	18	COMPANY_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-22 22:22:41.221	2026-09-23 10:22:38.371	\N	2026-09-22 22:22:38.373
b6045caa390ad27e06b44d70b0308cc78fd9391873d95a43	7	COMPANY_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-22 22:26:43.714	2026-09-23 10:22:48.858	\N	2026-09-22 22:22:48.861
b7ba90d73a574009654e93b9df4fe41356a1c409fe838098	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-22 22:28:08.209	2026-09-23 10:23:06.492	\N	2026-09-22 22:23:06.495
848901b5db463ad306fc025836cdc9d96e354de75cedd8f1	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-22 22:38:24.198	2026-09-23 10:28:22.581	2026-09-22 22:38:33.232	2026-09-22 22:28:22.589
5728c0337181700d4253db56f86ebb9ac3f038834f955cf1	7	COMPANY_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-22 22:38:12.219	2026-09-23 10:28:31.230	2026-09-22 22:38:33.233	2026-09-22 22:28:31.233
f93f0dd42ac50307193d95dad8f72b6620fe1197cec7f02a	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-22 22:41:52.502	2026-09-23 10:39:16.884	\N	2026-09-22 22:39:16.889
415cb855309ac4632516d3e6f18c71b62256b91c15ab09c9	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-22 23:01:22.195	2026-09-23 10:42:01.018	\N	2026-09-22 22:42:01.021
eca268e81a89305f5357f89746d1220c944a92649c9316e3	6	COMPANY_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-22 22:48:29.246	2026-09-23 10:42:27.133	2026-09-22 22:54:39.771	2026-09-22 22:42:27.141
b83a7ab999b9eed3fb018716c30d0540aab4791ebd10dd1b	6	COMPANY_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-22 23:00:48.074	2026-09-23 10:58:47.083	\N	2026-09-22 22:58:47.089
91076605f8fa07dfd2a743bc9eee0fd8a71ec6050167bc7f	16	COMPANY_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-23 06:52:07.145	2026-09-23 18:26:52.560	2026-09-23 06:52:08.572	2026-09-23 06:26:52.564
e65a35df97a094db651f38f807a9177afdb0ad4f5a1d81ed	7	COMPANY_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-23 07:09:01.870	2026-09-23 18:52:28.273	2026-09-23 07:09:23.533	2026-09-23 06:52:28.277
aa9e04ecc21bfdf050b401c94b54b20841a392b380ac37ec	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-23 07:33:14.714	2026-09-23 19:09:30.343	\N	2026-09-23 07:09:30.347
87d3df12d5f4a8e7d54f03291dd4b0d00fe488385127ff19	7	COMPANY_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-23 07:13:17.568	2026-09-23 19:13:16.762	\N	2026-09-23 07:13:16.766
6c8b00002cedc581309422ffbc53511bd75209c5a3b53dbb	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-23 07:33:52.178	2026-09-23 19:33:50.287	2026-09-23 07:33:53.680	2026-09-23 07:33:50.291
7e0c07255eb16ac8670175ce63b4703e7643bc305da23789	6	COMPANY_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-23 07:34:39.618	2026-09-23 19:34:38.842	2026-09-23 07:34:42.362	2026-09-23 07:34:38.845
00d5fad510f916cd2bd2ff62ea7340625a0c093ebea12874	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-23 07:46:40.139	2026-09-23 19:46:39.189	2026-09-23 07:47:38.222	2026-09-23 07:46:39.212
8d4f811f0312096fde2874286719ffd47313219ee9f857ce	6	COMPANY_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-23 07:51:00.143	2026-09-23 19:50:59.537	2026-09-23 07:51:05.687	2026-09-23 07:50:59.541
4282213558c4cae55e598b6328d81eee1fd98266f4daed5c	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-23 07:53:26.267	2026-09-23 19:52:25.546	\N	2026-09-23 07:52:25.548
92da5eb74b57cdee27db82c558370434028f7ae6c224e4fd	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-23 07:54:02.579	2026-09-23 19:54:01.926	2026-09-23 07:54:43.790	2026-09-23 07:54:01.928
328866d14ede6cc739b2f1b0f398e6f344ba9c43f410644a	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-23 07:56:20.215	2026-09-23 19:56:19.581	\N	2026-09-23 07:56:19.584
2bd0d931b713f4f13838e30f3ed726f94407ae4918b4d5b9	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-23 07:58:20.696	2026-09-23 19:57:10.901	2026-09-23 08:08:04.898	2026-09-23 07:57:10.905
20aaf269e50e380025af2f939a17eba95943ebd6b0814266	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-23 08:21:08.411	2026-09-23 20:11:06.961	\N	2026-09-23 08:11:06.966
a33b88d53251e04cc64359d7bd4626e7fe159b6c73d46806	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-23 09:42:08.901	2026-09-23 21:25:06.103	2026-09-23 09:43:08.967	2026-09-23 09:25:06.106
491d6eeff48d51fd658e445079454a4976e82497aa7c7e1a	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-23 10:13:24.382	2026-09-23 21:53:20.338	2026-09-23 10:22:47.487	2026-09-23 09:53:20.343
5c7fa2b258601eacf7c92e22ff527dba4401efcbac568dea	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-23 12:24:35.420	2026-09-24 00:24:34.393	2026-09-23 12:25:36.660	2026-09-23 12:24:34.396
7bc299a364043e491d810350943fa8b3146e8d9f997043d1	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-23 19:37:56.321	2026-09-24 07:25:21.209	2026-09-23 19:38:56.463	2026-09-23 19:25:21.233
28f686fad06b76c07c3e1612c71f2a9eb55e1c18e4efa494	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-23 20:31:32.295	2026-09-24 08:17:19.918	2026-09-23 20:32:03.917	2026-09-23 20:17:19.921
203b4deb1dd8b476193be533a5d56924e008853486af0aae	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-23 20:51:05.311	2026-09-24 08:32:47.452	2026-09-23 20:51:05.419	2026-09-23 20:32:47.459
c6f23073cf9db2b13d113bd06a24a5293632959e167829b7	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-23 21:04:09.364	2026-09-24 08:54:07.421	2026-09-23 21:04:54.241	2026-09-23 20:54:07.425
a4e00bb30aab2a29b3fc9870d477d4b4b0a451649e0eff7a	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-23 21:39:44.318	2026-09-24 09:26:40.817	2026-09-23 21:40:12.842	2026-09-23 21:26:40.822
1fb83dc65c33a48f6d724a7669c9837b6cfe0ca12150fa8e	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-23 22:06:59.314	2026-09-24 09:48:32.144	2026-09-23 22:27:57.160	2026-09-23 21:48:32.149
4019ed72aab897503fb8381a703aa525770bd0199c3c4b0c	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-23 22:59:56.328	2026-09-24 10:47:34.357	\N	2026-09-23 22:47:34.361
37157ce882d357d72b34dae001bb72474d4669ab000175e8	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-23 23:02:53.601	2026-09-24 11:00:57.473	2026-09-23 23:02:58.579	2026-09-23 23:00:57.477
21ad62969d0f71ffff2d76a05661d65be87c4e27b7f0564b	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-23 23:08:29.438	2026-09-24 11:05:27.689	2026-09-23 23:08:52.066	2026-09-23 23:05:27.693
f65d59e4173c7d251587fd7be0d54885d015791c6d768a02	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-23 23:10:25.275	2026-09-24 11:10:23.715	\N	2026-09-23 23:10:23.718
544f8ba9a5a98ca9523f94894303f85e21c7553acd3083d2	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-23 23:21:49.320	2026-09-24 11:11:01.773	2026-09-23 23:37:18.968	2026-09-23 23:11:01.776
0ed5f1ec09ddca09aff8e3728e4bac8c37236a97f500648d	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-23 23:43:07.148	2026-09-24 11:37:30.185	2026-09-23 23:43:57.783	2026-09-23 23:37:30.188
a63dc6708dd55e5981cca38c7c921af6b78cd5333eb1bfd3	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-23 23:57:35.013	2026-09-24 11:47:10.127	\N	2026-09-23 23:47:10.130
75de4c6c1f21d2fa1fcefdc4842197d816fa77834911d7b7	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-24 00:01:33.298	2026-09-24 11:57:57.357	\N	2026-09-23 23:57:57.360
7ebdeb8f933b37b11aefc8dee7f4ed86a9bdd26c667500e8	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-24 00:01:41.085	2026-09-24 12:01:40.384	2026-09-24 00:02:27.567	2026-09-24 00:01:40.387
c2ad63cb7bf5897fcfba6cbfa057f57a1f1661ee1cd7c734	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-24 00:04:25.604	2026-09-24 12:02:48.081	2026-09-24 00:04:29.404	2026-09-24 00:02:48.085
534b3c3722853834fa37cfd738b38505afb796801067ed26	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-24 00:10:39.707	2026-09-24 12:06:55.224	2026-09-24 00:11:23.409	2026-09-24 00:06:55.245
5ad553b9320b82039419454d0851e1db6cb15099b316802f	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-24 00:21:55.163	2026-09-24 12:12:34.100	\N	2026-09-24 00:12:34.104
2aa7ce0d05868654c63b55fa72f35e50e9f7b13d3efbb35f	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-24 00:32:13.154	2026-09-24 12:31:26.945	2026-09-24 00:32:19.724	2026-09-24 00:31:26.956
cd7ef2378455c77999c4876a4253ac19f8e2877342d9c176	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-24 00:35:03.305	2026-09-24 12:34:01.525	\N	2026-09-24 00:34:01.537
c025651e98ed4ff66cea74b0e3a11f18f7435025d688ca82	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-24 00:38:02.472	2026-09-24 12:35:49.957	\N	2026-09-24 00:35:49.960
2d153a209f0cc1b802bcd604ff61b9f33bc6fec6ba351625	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-24 00:39:20.086	2026-09-24 12:38:47.844	2026-09-24 00:39:22.970	2026-09-24 00:38:47.870
5ec0d4f7b986fe45a64f15553ba7a9b354e0f075a3a2b687	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-24 00:40:21.810	2026-09-24 12:40:21.152	2026-09-24 00:46:22.843	2026-09-24 00:40:21.155
34856ad2251af5b6dd960f1e6024201ce9253ed1e9bfa94c	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-24 00:48:47.351	2026-09-24 12:47:45.285	\N	2026-09-24 00:47:45.295
a856cb576e438436433668fe506c0b7e9413491dc9f22cf3	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-24 00:50:42.892	2026-09-24 12:48:50.581	\N	2026-09-24 00:48:50.584
7b6988a6f40f89e38c7b1186ed6a5e905b0e6315a2927a92	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-24 01:02:15.271	2026-09-24 12:51:06.863	2026-09-24 01:02:24.559	2026-09-24 00:51:06.881
e4438db068247263724cf859b45a0ea91e69229cd75da644	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-24 01:05:33.141	2026-09-24 13:05:30.214	\N	2026-09-24 01:05:30.220
28bd9cb5bb8bb1d33af2dcf406855c244e1ce67be426b9b1	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-24 01:24:57.788	2026-09-24 13:24:44.614	\N	2026-09-24 01:24:44.618
557025fb448aabb309965deb7bc66d9756435b3f5911f528	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-24 01:28:29.168	2026-09-24 13:26:09.081	\N	2026-09-24 01:26:09.084
b136d5a3e59fc86414bbf7f2a388d0b688f5329d1f7b2038	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-24 02:04:32.482	2026-09-24 13:41:47.291	\N	2026-09-24 01:41:47.293
680122025d2aa0cc2bb3cf5320fc5045f5029cdc31c0d837	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-24 02:06:37.933	2026-09-24 14:05:52.221	2026-09-24 02:07:14.338	2026-09-24 02:05:52.224
4884b3756b23fdc006a009886cb5d8fd68c0c1d610672285	7	COMPANY_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-24 02:09:43.871	2026-09-24 14:07:23.448	2026-09-24 02:10:01.506	2026-09-24 02:07:23.451
9d157017a30ba2cb66a2f5e023caa7a3c248c7dfbfadca33	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-24 02:14:53.300	2026-09-24 14:12:47.158	2026-09-24 02:17:28.762	2026-09-24 02:12:47.161
1d2790205491500bf2f4375239691aae6639a3185ae998c7	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-24 02:47:56.429	2026-09-24 14:17:36.466	2026-09-24 02:58:40.001	2026-09-24 02:17:36.468
a89118c0458464a5b0e94c1dbf6b31527b8e6afe207506d7	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-24 04:03:56.499	2026-09-24 15:28:13.600	2026-09-24 08:26:21.596	2026-09-24 03:28:13.605
fb479f109aa85a7c59d37101d1ffdd8cc8953681550cc32c	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-24 09:08:46.402	2026-09-24 21:08:42.301	2026-09-24 09:10:32.897	2026-09-24 09:08:42.315
0e32d9adaf93a3bee075e29f4e5eae0bcdbf4c61586f5fae	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-24 09:36:14.535	2026-09-24 21:31:11.918	2026-09-24 09:37:44.178	2026-09-24 09:31:11.940
dd541e7878e154eccd1f190cf6cfbd121d810998c5d88964	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-24 09:47:16.355	2026-09-24 21:38:27.305	2026-09-24 09:47:23.035	2026-09-24 09:38:27.308
f33f6389987ad21dddc361ca9235b9e71bb18c5557e8c698	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-24 10:06:04.875	2026-09-24 22:02:45.534	\N	2026-09-24 10:02:45.557
eeea613c8ca3a8320320d30d0c5f94a615e2536fdbd7dac4	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-24 10:17:24.836	2026-09-24 22:08:13.297	\N	2026-09-24 10:08:13.307
147285455eeba85b7f96bc5880a1f10194ac0e3d78a85e06	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-24 10:32:46.314	2026-09-24 22:30:44.662	\N	2026-09-24 10:30:44.680
6353d7e4f16b7c93d560576bdf33680985442aa5849a7783	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-24 10:50:29.304	2026-09-24 22:46:27.160	2026-09-24 18:00:30.438	2026-09-24 10:46:27.165
dbb12c30af8e6147cd96c2317a1346a0e9e88cb8365a5662	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-24 18:14:32.003	2026-09-25 06:02:03.698	\N	2026-09-24 18:02:03.728
4dfaa504dfb4af7105915adfe6b3b140ef233d2c35faa17c	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-24 18:25:50.326	2026-09-25 06:14:43.871	\N	2026-09-24 18:14:43.892
17cbf29458df87d99edf13f8e7ee39d9aa1363805e9a07c0	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-24 18:26:20.732	2026-09-25 06:26:19.489	2026-09-24 18:26:34.809	2026-09-24 18:26:19.492
4b15f9ef25bba91b0be0393fe13f78f56b305935b7321e85	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-24 18:28:18.002	2026-09-25 06:28:17.136	\N	2026-09-24 18:28:17.158
d14f5b278c7cb371d67d6350219653ff2a86dfe6922a74bb	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-24 18:43:42.324	2026-09-25 06:34:13.884	\N	2026-09-24 18:34:13.901
817fafc5fd1b620b99aff9f65167dd2afb614dddd87f6697	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-25 06:05:39.378	2026-09-25 18:03:34.914	\N	2026-09-25 06:03:34.956
52828827741dfac23b1049e6d4a422756690ef7f9b348095	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-25 06:17:18.746	2026-09-25 18:11:00.451	\N	2026-09-25 06:11:00.468
385b926f8a9bafea345c40e00e75001d56e16bfa9db3a813	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-25 06:39:56.328	2026-09-25 18:25:41.363	2026-09-25 06:40:56.439	2026-09-25 06:25:41.398
d97f8e06b49d27e57903aba8c3bb64371efe3d5feca028a4	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-25 08:33:56.338	2026-09-25 20:16:38.110	2026-09-25 08:41:01.248	2026-09-25 08:16:38.130
a7fc5c1b550145ebf2b938872e7996a7588e3bae32be73cb	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-25 13:12:15.341	2026-09-26 00:59:23.062	2026-09-25 13:48:14.061	2026-09-25 12:59:23.088
4c7ba6687ceb70eb4faac8c41fafad7fc42b0635e10a6362	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-25 15:39:08.211	2026-09-26 02:43:39.705	2026-09-25 15:46:42.141	2026-09-25 14:43:39.714
c7e5172717d3513d29a43b527fc4dbfa85b9cd6b4e66cdea	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-25 16:10:51.373	2026-09-26 03:46:55.277	2026-09-25 16:11:48.150	2026-09-25 15:46:55.290
719f9935fb24685b13f6efef7eda47882dcf8285d8d260de	16	COMPANY_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-25 16:54:16.271	2026-09-26 04:51:12.764	\N	2026-09-25 16:51:12.789
adf21c7aa838b2814337bbd1494d871115738f8a1d4ce334	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-25 17:04:51.187	2026-09-26 05:01:44.614	\N	2026-09-25 17:01:44.617
ecb6f7e56348a3380008519bea65d8ce37591b65c8cf84f3	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-25 17:43:36.193	2026-09-26 05:18:12.774	\N	2026-09-25 17:18:12.778
03bb2ea56f76ac0c91aa1415ffbc0c1bdfa197e00743ad29	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-25 17:53:27.213	2026-09-26 05:44:39.099	2026-09-25 18:11:06.814	2026-09-25 17:44:39.104
24f5406bfe45479a8f336664321a0010ac12b39253f78029	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-25 18:31:27.192	2026-09-26 06:11:11.068	2026-09-25 18:32:27.198	2026-09-25 18:11:11.093
a4d19f647b64c28917eccd788c365a754575881826e32a40	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-25 20:42:27.306	2026-09-26 08:31:29.350	2026-09-25 20:44:39.003	2026-09-25 20:31:29.357
d9831bde0b1cd78f640437ffb37812bbf90d9ea68f579424	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-25 20:59:24.217	2026-09-26 08:56:11.705	\N	2026-09-25 20:56:11.730
a6bdf643857cdda2f82cbbdc9a29994ec6948296a6a78d31	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-25 21:53:27.365	2026-09-26 09:39:53.929	2026-09-25 21:54:27.629	2026-09-25 21:39:53.935
b1298c5c09bdd0faf86a4980f308eab1db65dba1d14646e0	16	COMPANY_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-25 22:15:14.217	2026-09-26 10:06:02.798	2026-09-25 22:35:16.447	2026-09-25 22:06:02.802
2b96265c6a1b2dbd9bf1513010cae96a231f07fa83025257	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-25 22:37:13.640	2026-09-26 10:37:10.350	\N	2026-09-25 22:37:10.354
0f42bc786c6b033586e6dc3e31fcd40b4cde5f96f0f151a1	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-25 22:41:26.082	2026-09-26 10:41:21.035	2026-09-25 22:44:39.210	2026-09-25 22:41:21.042
aa22546fef489afae27e34505ac363d3e2bd971c2477aa5f	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-25 22:46:47.206	2026-09-26 10:44:45.534	\N	2026-09-25 22:44:45.557
70d7e71b0842e6f77422ae5150efcee3dfda935c9af9fc39	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-25 23:02:07.154	2026-09-26 10:50:37.527	2026-09-25 23:03:27.300	2026-09-25 22:50:37.531
079dd4afae640a07faf945f7c7dd6532cc817cfdd39b1821	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-25 23:13:52.555	2026-09-26 11:04:50.651	2026-09-25 23:13:59.352	2026-09-25 23:04:50.660
ef0de30c277989503f6ce391b0bd7421b897d3547b0c050f	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-25 23:15:48.235	2026-09-26 11:15:47.426	\N	2026-09-25 23:15:47.428
8e2793738bacad6839fa18a261425cef1f3d7f8d534bdf16	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-25 23:26:54.252	2026-09-26 11:24:35.896	\N	2026-09-25 23:24:35.917
8b2c9dab6722c40793a018e7024730675b148ff2352e18b2	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-25 23:28:34.810	2026-09-26 11:28:34.810	\N	2026-09-25 23:28:34.813
29ce4ffb92e44bd3f867daa927cf51314585911b2279c652	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-25 23:38:20.247	2026-09-26 11:37:16.318	\N	2026-09-25 23:37:16.348
59a4df96dc30f5505c165f80810f3e2a33c339c75ef5c04f	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-25 23:42:31.660	2026-09-26 11:39:18.097	2026-09-25 23:44:39.545	2026-09-25 23:39:18.100
697b53d25b9261494207fb93abc5651e4dba44d9303941e3	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-26 00:01:02.096	2026-09-26 11:44:42.860	\N	2026-09-25 23:44:42.864
51628ad53c42ba1554d0c6eb907d0a859170f880a6a36d46	16	COMPANY_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-26 00:02:37.640	2026-09-26 11:45:42.631	2026-09-26 00:02:42.119	2026-09-25 23:45:42.635
02ea5d0a6b8e29dc6798e9c072e24dbd0f32abb67f6336b6	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-26 00:07:13.482	2026-09-26 12:07:13.482	2026-09-26 00:07:39.545	2026-09-26 00:07:13.488
cea92666643195050cf2e20b50251831d24ffa94bf7db6f6	16	COMPANY_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-26 00:08:08.214	2026-09-26 12:08:06.266	2026-09-26 00:08:29.721	2026-09-26 00:08:06.269
a6118b9ad7787258eb26c2dcbbd9b8babea37c5cd2b55d72	16	COMPANY_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-26 04:23:44.290	2026-09-26 16:22:41.172	\N	2026-09-26 04:22:41.176
2c3fab972bd812cca8b2c5c3093f71f572f30d573798cb48	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-26 04:23:39.150	2026-09-26 16:23:34.096	\N	2026-09-26 04:23:34.100
cb90deba3b39ea8b77519644bcfe2aec8951f8250970f05e	16	COMPANY_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-26 05:45:26.412	2026-09-26 17:27:31.328	\N	2026-09-26 05:27:31.335
92ce0bf0ac30977017dddde98e1df7c68549cead30f37efb	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-26 05:48:04.196	2026-09-26 17:36:13.494	\N	2026-09-26 05:36:13.496
77400a8a17288bbd0173c5c408add427ca6722f0d64fcdfa	7	COMPANY_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-26 05:48:58.439	2026-09-26 17:36:53.615	\N	2026-09-26 05:36:53.618
0d601f674d9d6b0d53d34554b9f9a6ba09e8f78c1dd7791d	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-26 05:52:00.248	2026-09-26 17:50:56.442	\N	2026-09-26 05:50:56.454
4df589da3cd2dcb9ef705cee6fbaa5ecfa4a6d461c46da1c	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-26 06:08:07.192	2026-09-26 17:54:52.100	2026-09-26 06:15:25.672	2026-09-26 05:54:52.112
2f29ef8655d3e0fec472baffe907379bdc599bc3be1d9c36	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-26 06:20:55.356	2026-09-26 18:15:50.442	\N	2026-09-26 06:15:50.445
81830599d139239a5ec5719f21e4decdc8f286ef94ecb23d	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-26 06:16:18.661	2026-09-26 18:16:17.910	2026-09-26 06:23:30.993	2026-09-26 06:16:17.914
7cb8cff5635beed75e9ccab62e79360d44bc1919efa9edce	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-26 06:30:07.235	2026-09-26 18:26:05.241	2026-09-26 06:36:48.286	2026-09-26 06:26:05.245
ac28569c4f3267577845817470c4cc50f5a8dde751062ba0	6	COMPANY_ADMIN	545ea538461003efdc8c81c244531b003f6f26cf	2026-09-26 07:34:16.961	2026-09-26 19:34:16.961	\N	2026-09-26 07:34:16.985
f3b1328b84255dc2ad1d6c1d5c49cda7bdd1e383ad39a851	7	COMPANY_ADMIN	545ea538461003efdc8c81c244531b003f6f26cf	2026-09-26 07:34:23.419	2026-09-26 19:34:23.419	\N	2026-09-26 07:34:23.422
7f18c701c1f6a3aa95a5608ab295f82f9d16bfe391d01bbc	19	COMPANY_ADMIN	545ea538461003efdc8c81c244531b003f6f26cf	2026-09-26 07:34:25.443	2026-09-26 19:34:25.443	\N	2026-09-26 07:34:25.446
ee476b7f4076f0a648fe8272bec5e4c70cdac9cf98b18299	18	COMPANY_ADMIN	545ea538461003efdc8c81c244531b003f6f26cf	2026-09-26 07:34:27.118	2026-09-26 19:34:27.118	\N	2026-09-26 07:34:27.121
3f45583b17d995d66b65d31dfce01575b9a66d77f007edaf	16	COMPANY_ADMIN	545ea538461003efdc8c81c244531b003f6f26cf	2026-09-26 07:34:30.493	2026-09-26 19:34:30.493	\N	2026-09-26 07:34:30.497
c3869407f648f0943a6b755038c0f5692f592c8123240955	15	COMPANY_ADMIN	545ea538461003efdc8c81c244531b003f6f26cf	2026-09-26 07:34:32.028	2026-09-26 19:34:32.028	\N	2026-09-26 07:34:32.031
edf2cc550892246e00ca572ee67807f94126cd021c4fa95c	1	SUPER_ADMIN	ac628f4cfda1bcac1aa445ee899b5f1385b4ffff	2026-09-26 09:16:45.128	2026-09-26 21:12:40.817	2026-09-26 09:17:12.068	2026-09-26 09:12:40.822
fb97a41e8f3551d53e4cd6fb1ad92887bb569e7d84375c1a	1	SUPER_ADMIN	ac628f4cfda1bcac1aa445ee899b5f1385b4ffff	2026-09-26 09:23:02.113	2026-09-26 21:21:01.378	2026-09-26 09:32:45.626	2026-09-26 09:21:01.382
2e56547faaf9084d0ca06ece63b7be2979a7cd931d37c2fb	1	SUPER_ADMIN	ac628f4cfda1bcac1aa445ee899b5f1385b4ffff	2026-09-26 09:35:57.939	2026-09-26 21:35:56.921	\N	2026-09-26 09:35:56.925
21361d45e367eabab8125f7bb44c0f982d542c31435c304b	1	SUPER_ADMIN	ac628f4cfda1bcac1aa445ee899b5f1385b4ffff	2026-09-26 09:49:59.128	2026-09-26 21:38:00.450	2026-09-26 09:50:59.158	2026-09-26 09:38:00.453
bc9c9840a5653ca5a4ffe6de4e11f8ae7d9c14bb597631bb	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-26 13:27:47.328	2026-09-27 01:16:51.897	2026-09-26 13:28:47.383	2026-09-26 13:16:51.920
d9ba8baa478e821da0ea982fa222488a6c004f9711e6ee50	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-27 04:49:48.373	2026-09-27 16:48:47.418	2026-09-27 04:50:48.216	2026-09-27 04:48:47.420
645b9d778cc64531d855e2498a974d76591d38fb5561b3c9	7	COMPANY_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-27 05:02:35.028	2026-09-27 16:50:55.477	2026-09-27 05:03:27.453	2026-09-27 04:50:55.480
f6c2ac4f5cba3336ce2fa341ac2969edae999e406af42a97	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-27 05:06:51.462	2026-09-27 17:05:49.928	\N	2026-09-27 05:05:49.933
97981f87aa39f91efc7f50f21ab2407d23eb9ca027967090	1	SUPER_ADMIN	ac628f4cfda1bcac1aa445ee899b5f1385b4ffff	2026-09-27 05:18:27.448	2026-09-27 17:08:15.450	2026-09-27 05:19:27.470	2026-09-27 05:08:15.454
1050260d84e83c552655f6f499704d608512bad709c73150	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-27 05:31:38.414	2026-09-27 17:31:37.480	\N	2026-09-27 05:31:37.483
a3fa3d687db5aa6838032683ba83f99035407438081a2c8b	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-27 06:23:27.457	2026-09-27 18:14:07.947	2026-09-27 06:24:27.892	2026-09-27 06:14:07.950
f593444a996f56b2df7a4566b0c3c0977ce9783556e85de9	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-27 06:55:24.003	2026-09-27 18:55:22.064	\N	2026-09-27 06:55:22.067
cbfdf35c862e6f64aecd57d107587a7cff49ca92d7778a19	1	SUPER_ADMIN	ddd94aeaace05dc34bce08f693b77587e3287ed6	2026-09-27 06:58:23.283	2026-09-27 18:56:52.259	\N	2026-09-27 06:56:52.261
a022a9cabea1c15299b17a17b02135b76f5f873b37cd8f5b	1	SUPER_ADMIN	a4bb48293cf10268cc3e6170b58a3c0c3021432f	2026-09-27 07:10:27.461	2026-09-27 19:00:23.330	2026-09-27 07:11:09.865	2026-09-27 07:00:23.333
4248266ef51e1425aa3c57d93d914f6e707773bc449ef8cf	16	COMPANY_ADMIN	a4bb48293cf10268cc3e6170b58a3c0c3021432f	2026-09-27 07:20:04.452	2026-09-27 19:17:02.003	\N	2026-09-27 07:17:02.026
99976b261dc293afde826349cdbbc8aa697fe86917e945ab	1	SUPER_ADMIN	a4bb48293cf10268cc3e6170b58a3c0c3021432f	2026-09-27 07:20:59.234	2026-09-27 19:20:58.310	\N	2026-09-27 07:20:58.313
ddaab2f15aac1c225870767583bc0c087f61fb24acab4dca	1	SUPER_ADMIN	a4bb48293cf10268cc3e6170b58a3c0c3021432f	2026-09-27 07:29:43.454	2026-09-27 19:25:42.044	2026-09-27 08:42:16.280	2026-09-27 07:25:42.048
a57d181da37dd3a5c5accc93cd8f1a43508558fe823e5121	1	SUPER_ADMIN	a4bb48293cf10268cc3e6170b58a3c0c3021432f	2026-09-27 08:50:06.455	2026-09-27 20:48:05.152	2026-09-27 09:09:11.186	2026-09-27 08:48:05.157
c861515f408d2c399ff51949be5f521cc99c8f515eda1237	1	SUPER_ADMIN	a4bb48293cf10268cc3e6170b58a3c0c3021432f	2026-09-27 09:08:05.249	2026-09-27 21:01:03.214	\N	2026-09-27 09:01:03.217
33ec3921517bc75182aef94802739fba8c8d42be8ed36e39	1	SUPER_ADMIN	a4bb48293cf10268cc3e6170b58a3c0c3021432f	2026-09-27 09:08:34.512	2026-09-27 21:08:32.383	2026-09-27 09:09:17.609	2026-09-27 09:08:32.386
274226162277f6a337d695bb57057e6dda5a00dffe136d17	1	SUPER_ADMIN	a4bb48293cf10268cc3e6170b58a3c0c3021432f	2026-09-27 10:35:02.802	2026-09-27 22:28:55.241	\N	2026-09-27 10:28:55.247
c3c4a34f23175737e2cad3ded00bd16a13d07495f3dfd433	1	SUPER_ADMIN	a4bb48293cf10268cc3e6170b58a3c0c3021432f	2026-09-27 10:45:04.508	2026-09-27 22:35:35.488	2026-09-27 10:46:04.693	2026-09-27 10:35:35.492
70575c3f44d7e2e651111d64552e29f5cfbb87d99a0f5947	1	SUPER_ADMIN	a4bb48293cf10268cc3e6170b58a3c0c3021432f	2026-09-27 11:06:10.339	2026-09-27 23:06:09.500	\N	2026-09-27 11:06:09.504
6de34827f52e638043aac7a47b75de989cf7fea1e7bb463b	1	SUPER_ADMIN	a4bb48293cf10268cc3e6170b58a3c0c3021432f	2026-09-27 11:07:12.758	2026-09-27 23:07:11.972	\N	2026-09-27 11:07:11.974
360584aab6d4049749a5f3f9bc2a8dc9e7521152691cd4d7	124	COMPANY_ADMIN	a4bb48293cf10268cc3e6170b58a3c0c3021432f	2026-09-27 11:07:20.289	2026-09-27 23:07:20.289	\N	2026-09-27 11:07:20.291
f3022f69522dc0637f515e684ed7a3c8177e75e2b785e6d9	124	COMPANY_ADMIN	a4bb48293cf10268cc3e6170b58a3c0c3021432f	2026-09-27 11:17:04.563	2026-09-27 23:07:20.353	2026-09-27 11:18:04.483	2026-09-27 11:07:20.356
\.


--
-- Data for Name: companies; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.companies (id, name, slug, type, email, phone, location, district, address, registration_number, logo_file_name, description, status, market_id, deleted_at, created_at, updated_at, profile_data) FROM stdin;
23	Mogadishu Power Supply	mogadishu-power-supply	ELECTRICITY	admin@mps.so	+252 621 000 111	Bakaro Market, Howlwadaag District, Mogadishu, Somalia	Howlwadaag	Bakaro Market, Howlwadaag District, Mogadishu, Somalia	\N	\N	\N	ACTIVE	2	\N	2026-07-08 06:52:00	2026-09-15 15:10:49.497	{"slug": "mogadishu-power-supply", "email": "admin@mps.so", "phone": "+252 621000111", "somali": "Korontada Muqdisho", "address": "Bakaro Market, Howlwadaag District, Mogadishu, Somalia", "tagline": "Powering Mogadishu since 1994", "website": "https://www.muqdishopower.com/", "altPhone": "+252 621111100", "facebook": "", "location": "Mogadishu", "infoBrief": "Mogadishu Power Supply (MPS) is one of Somalia's oldest private electricity companies, founded in 1994. The company provides electricity generation, transmission, distribution, electrical installation services, and renewable energy solutions for residential, commercial, and industrial customers across Mogadishu and nearby regions.", "infoTitle": "About Mogadishu Power Supply", "ratesNote": "", "updatedAt": "2026-09-15T15:10:49.494Z", "callCenter": "188", "infoPoints": ["Headquarters: Bakaro Market, Howlwadaag", "Coverage: Bakaro, Howlwadaag, Waberi, Hodan, Yaaqshiid, Hiliwaa & more", "Also serves Dayniile, Kaaraan, Tabeelaha, Garasbaaley, Balcad & Jowhar", "Services: Grid supply, installations & renewable energy solutions", "Energy: Grid electricity & solar power", "Support: Call Center 188 · +252 621000111 · info@muqdishopower.com"], "supplyType": "Grid Electricity & Solar Power", "typesTitle": "", "companyName": "Mogadishu Power Supply", "description": "Mogadishu Power Supply is Somalia’s first-established and largest electricity provider, founded after the collapse of the Somali Central Government to deliver sustainable energy to homes, businesses, and industries.", "heroEyebrow": "", "trendsTitle": "", "waterSource": "", "addressLabel": "Head Office", "currentPrice": "", "serviceAreas": "", "businessHours": "", "providerLabel": "MPS", "snapshotTitle": "", "typesSubtitle": "", "trendsSubtitle": "", "calculatorTitle": "", "categoriesTitle": "", "tierRateHistory": {"2022": {"low": 0.35, "mid": 0.29, "high": 0.23}, "2023": {"low": 0.38, "mid": 0.32, "high": 0.26}, "2024": {"low": 0.41, "mid": 0.35, "high": 0.3}, "2025": {"low": 0.41, "mid": 0.35, "high": 0.3}, "2026": {"low": 0.41, "mid": 0.35, "high": 0.3}}, "snapshotSubtitle": "", "yearlyRateHistory": {"2022": 0.35, "2023": 0.38, "2024": 0.41, "2025": 0.41, "2026": 0.41}, "calculatorSubtitle": "", "categoriesSubtitle": "", "calculatorEmptyHint": ""}
24	Blue Sky Energy	blue-sky-energy	ELECTRICITY	admin@blueskyenergy.so	+252 62 899 9645	Eng. Yariisow Stadium, Abdiaziz District, Mogadishu, Somalia	Abdiaziz	Eng. Yariisow Stadium, Abdiaziz District, Mogadishu, Somalia	\N	\N	\N	ACTIVE	2	\N	2026-07-05 11:52:00	2026-09-22 20:42:41.687	{"slug": "blue-sky-energy", "email": "admin@blueskyenergy.so", "phone": "+252 62 899 9645", "somali": "Blue Sky Energy", "address": "Eng. Yariisow Stadium, Abdiaziz District, Mogadishu, Somalia", "tagline": "Reliable Energy", "website": "https://blueskyenergy.so/", "altPhone": "+252 61 287 8830", "facebook": "", "location": "Mogadishu", "infoBrief": "Blue Sky Energy (BSE) is a private electricity company established in Mogadishu in 2015, providing reliable grid and solar power services — including low-, medium-, and high-voltage supply across Somalia.", "infoTitle": "About Blue Sky Energy", "ratesNote": "", "updatedAt": "2026-09-22T20:42:41.685Z", "callCenter": "3030", "infoPoints": ["HQ: Abdiaziz District, Mogadishu", "Residential, commercial, industrial & government customers", "NGOs and international companies served nationwide", "Low, medium & high voltage electricity across Somalia", "Energy: Grid electricity & solar power", "Support: Call Center 3030 · +252 62 899 9645 · info@blueskyenergy.so"], "supplyType": "Grid Electricity & Solar Power", "typesTitle": "", "companyName": "Blue Sky Energy", "description": "Blue Sky Energy (BSE) is a private energy company that provides electrical services in all over Somalia. The company was founded in 30 July 2015 in Mogadishu.", "heroEyebrow": "22", "trendsTitle": "", "waterSource": "", "addressLabel": "Head Office", "currentPrice": "", "serviceAreas": "", "businessHours": "", "providerLabel": "BSE", "snapshotTitle": "", "typesSubtitle": "", "trendsSubtitle": "", "calculatorTitle": "", "categoriesTitle": "", "tierRateHistory": {"2022": {"low": 0.36, "mid": 0.31, "high": 0.25}, "2023": {"low": 0.36, "mid": 0.3, "high": 0.25}, "2024": {"low": 0.38, "mid": 0.33, "high": 0.28}, "2025": {"low": 0.41, "mid": 0.35, "high": 0.3}, "2026": {"low": 0.41, "mid": 0.35, "high": 0.3}}, "snapshotSubtitle": "", "yearlyRateHistory": {"2022": 0.36, "2023": 0.36, "2024": 0.38, "2025": 0.41, "2026": 0.41}, "calculatorSubtitle": "", "categoriesSubtitle": "", "calculatorEmptyHint": ""}
1	Banadir Water Development Company	bawadco	WATER_SUPPLY	info@bawadco.so	+252 613 491 008	Howlwadaag District, Banadir Region, Mogadishu, Somalia	Howlwadaag	Howlwadaag District, Banadir Region, Mogadishu, Somalia		\N		ACTIVE	1	\N	2026-08-10 07:32:22.814	2026-09-23 06:45:23.326	{"slug": "bawadco", "email": "info@bawadco.so", "phone": "+252 613 491 008", "somali": "Shirkadda Horumarinta Biyaha ee Banadir", "address": "Howlwadaag District, Banadir Region, Mogadishu, Somalia", "tagline": "Banadir Water Development Company", "website": "https://banadirwater.so/", "altPhone": "", "facebook": "", "location": "Howlwadaag District, Banadir Region, Mogadishu, Somalia", "infoBrief": "Banadir Water Development Company (BAWADCO) is a locally owned water utility established in 2013. The company supplies clean underground water to residential, commercial, and industrial customers throughout Banadir Region. Its services include water production, distribution, tanker delivery, and customer connection services.", "infoTitle": "About BAWADCO", "ratesNote": "", "updatedAt": "2026-08-11T12:44:47.511Z", "callCenter": "", "infoPoints": ["Company: Banadir Water Development Company (BAWADCO)", "Founded: 2013", "HQ: Howlwadaag District, Banadir Region, Mogadishu", "Supply Type: Underground Borehole Water", "Coverage: All Districts of Banadir Region", "Support: +252 613 491 008", "Email: info@banadirwater.so"], "supplyType": "Underground Borehole Water", "typesTitle": "", "description": "Locally owned water utility supplying clean underground water to residential, commercial, and industrial customers throughout Banadir Region.", "heroEyebrow": "", "trendsTitle": "", "waterSource": "Underground Borehole Water", "addressLabel": "HQ", "currentPrice": "", "serviceAreas": "", "businessHours": "", "providerLabel": "BAWADCO", "snapshotTitle": "", "typesSubtitle": "", "trendsSubtitle": "", "calculatorTitle": "", "categoriesTitle": "", "snapshotSubtitle": "", "yearlyRateHistory": {"2022": 1.4, "2023": 1.4, "2024": 1.5, "2025": 0.41, "2026": 1.6}, "calculatorSubtitle": "", "categoriesSubtitle": "", "calculatorEmptyHint": ""}
21	Towfiiq	banadir-water	WATER_SUPPLY	info@towfiiq.so	+252 610 795 571	Sinai Street, Mogadishu, Somalia	Hodan	Sinai Street, Mogadishu, Somalia		/uploads/companies/banadir-water-1788354327705.jpg		ACTIVE	1	\N	2026-07-12 03:52:00	2026-09-25 22:09:03.737	{"slug": "banadir-water", "email": "info@towfiiq.so", "image": "/uploads/companies/banadir-water-1788354327705.jpg", "phone": "+252 610 795 571", "somali": "Shirkadda Horumarinta Biyaha ee Tawfiiq", "address": "dabakaaymadow, Mogadishu, Somalia", "tagline": "Towfiiq", "website": "", "altPhone": "+252 61 925 6728", "facebook": "https://www.facebook.com/Towfiiq", "location": "Sinai Street, Mogadishu, Somalia", "infoBrief": "Towfiiq (Towfiiq) is a private water utility company that supplies clean drinking water from underground boreholes to households and businesses in Mogadishu. The company operates a local water distribution network and serves several districts in northern and central Mogadishu, focusing on reliable and safe water services.", "infoTitle": "About Towfiiq", "ratesNote": "", "updatedAt": "2026-09-25T22:09:03.734Z", "callCenter": "", "infoPoints": ["Company: Towfiiq (Towfiiq)", "Founded: 2012", "HQ: Sinai Street, Mogadishu", "Supply Type: Underground Borehole Water", "Coverage: Kaaraan, Yaaqshiid, Shibis, Boondheere, Abdiaziz, Shangaani & Hiliwaa", "Phone: +252 610 795 571", "Alternative Phone: +252 61 925 6728", "Status: Open 24 Hours"], "supplyType": "Underground Borehole Water", "typesTitle": "", "companyName": "Shirkada biyaha Towfiiq", "description": "Private water utility supplying clean underground borehole water to households and businesses across several Mogadishu districts.", "heroEyebrow": "", "trendsTitle": "", "waterSource": "Underground Borehole Water", "addressLabel": "HQ", "currentPrice": "", "serviceAreas": "", "businessHours": "Open 24 Hours", "providerLabel": "Towfiiq", "snapshotTitle": "", "typesSubtitle": "", "trendsSubtitle": "", "calculatorTitle": "", "categoriesTitle": "", "snapshotSubtitle": "", "yearlyRateHistory": {"2022": 1.4, "2023": 1.4, "2024": 1.5, "2025": 0.41, "2026": 1.6}, "calculatorSubtitle": "", "categoriesSubtitle": "", "calculatorEmptyHint": ""}
20	WABAX Water Supply Co.	wabax	WATER_SUPPLY	admin@wabax.so	+252 61 999 0049	Afgoye–Mogadishu Road, Mogadishu, Somalia	Daynile	Afgoye–Mogadishu Road, Mogadishu, Somalia	\N	\N	\N	ACTIVE	1	\N	2026-07-14 07:52:00	2026-09-23 06:45:23.347	{"slug": "wabax", "email": "admin@wabax.so", "phone": "+252 61 999 0049", "somali": "WABAX", "address": "Afgoye–Mogadishu Road, Mogadishu, Somalia", "tagline": "Water Supply & Distribution · Mogadishu", "website": "", "altPhone": "", "facebook": "", "location": "Afgoye–Mogadishu Road, Mogadishu, Somalia", "infoBrief": "WABAX Water Supply Company is a private water utility company based in Mogadishu. It supplies clean underground borehole water to residential and commercial customers through its local water distribution network, with a focus on providing reliable and affordable water services.", "infoTitle": "About WABAX", "ratesNote": "", "updatedAt": "2026-09-20T19:18:05.802Z", "callCenter": "", "infoPoints": ["Company: WABAX Water Supply Company", "Founded: 2016", "HQ: Afgoye–Mogadishu Road, Mogadishu", "Supply Type: Underground Borehole Water", "Coverage: Residential & Commercial Areas", "Phone: +252 61 999 0049", "Address: 372F+Q92, Afgoye–Mogadishu Road, Mogadishu"], "supplyType": "Underground Borehole Water", "typesTitle": "", "companyName": "WABAX Water Supply Co.", "description": "Private water utility based in Mogadishu supplying clean underground borehole water to residential and commercial customers through a local distribution network.", "heroEyebrow": "", "trendsTitle": "", "waterSource": "Underground Borehole Water", "addressLabel": "HQ", "currentPrice": "", "serviceAreas": "", "businessHours": "", "providerLabel": "WABAX", "snapshotTitle": "", "typesSubtitle": "", "trendsSubtitle": "", "calculatorTitle": "", "categoriesTitle": "", "snapshotSubtitle": "", "yearlyRateHistory": {"2022": 1.4, "2023": 1.4, "2024": 1.5, "2025": 0.41, "2026": 1.6}, "calculatorSubtitle": "", "categoriesSubtitle": "", "calculatorEmptyHint": ""}
55	hbhashshs	hbhashshs	WATER_SUPPLY	hana@gmail.com	+252 619643334	shbshdsdew, Bondhere District, Banadir Region, Somalia	Bondhere	shbshdsdew	\N	\N	\N	ACTIVE	1	\N	2026-09-27 10:35:16.709	2026-09-27 10:35:16.709	{"acronym":"HBHASH","companyEmail":"hana@ga.so"}
56	hamar	hamar	WATER_SUPPLY	mascuud@gmail.com	+252 615527447	hool wadaag, Abdiaziz District, Banadir Region, Somalia	Abdiaziz	hool wadaag	\N	\N	\N	ACTIVE	1	\N	2026-09-27 11:07:18.024	2026-09-27 11:07:18.024	{"acronym":"HAMAR","companyEmail":"hamar@hrm.so"}
2	BECO	beco	ELECTRICITY	contact@beco.so	+252 619 111 114	Tarabuun Street, Hodan District, Mogadishu, Somalia	Hodan	Tarabuun Street, Hodan District, Mogadishu, Somalia		\N		ACTIVE	2	\N	2026-08-10 07:32:22.838	2026-09-23 06:58:44.504	{"slug": "beco", "email": "contact@beco.so", "phone": "+252 619 111 114", "somali": "Shirkadda BECO", "address": "Tarabuun Street, Hodan District, Mogadishu, Somalia", "tagline": "Powering Somalia", "website": "https://beco.so/", "altPhone": "", "facebook": "", "location": "Tarabuun Street, Hodan District, Mogadishu, Somalia", "infoBrief": "BECO is one of Somalia's leading electricity companies, providing reliable, affordable, and sustainable electricity services. Established in 2014, the company operates power generation, transmission, and distribution systems while investing in renewable energy projects, including solar power, to improve electricity access across Somalia.", "infoTitle": "About BECO", "ratesNote": "", "updatedAt": "2026-09-23T06:58:44.493Z", "callCenter": "333", "infoPoints": ["Founded: 2014 · Headquarters: Hodan, Mogadishu", "Coverage: All 17 districts of Banadir Region", "Also serves Jubbaland, South West State, and Hirshabelle", "Key sites: Aden Adde Airport, Mogadishu Seaport, government & embassies", "Energy: Grid electricity & solar power", "Support: +252 619 111 114 · Call Center: 333 · info@beco.so"], "supplyType": "Grid Electricity & Solar Power", "typesTitle": "", "companyName": "BECO", "description": "Beco is the largest electricity power provider in Somalia\\nwith high tension and solar system", "heroEyebrow": "", "trendsTitle": "", "waterSource": "", "addressLabel": "Head Office", "currentPrice": "", "serviceAreas": "", "businessHours": "", "providerLabel": "BECO", "snapshotTitle": "", "typesSubtitle": "", "trendsSubtitle": "", "calculatorTitle": "", "categoriesTitle": "", "tierRateHistory": {"2022": {"low": 0.35, "mid": 0.29, "high": 0.23}, "2023": {"low": 0.38, "mid": 0.32, "high": 0.26}, "2024": {"low": 0.41, "mid": 0.35, "high": 0.3}, "2025": {"low": 0.41, "mid": 0.35, "high": 0.3}, "2026": {"low": 0.41, "mid": 0.35, "high": 0.3}}, "snapshotSubtitle": "", "yearlyRateHistory": {"2022": 0.35, "2023": 0.38, "2024": 0.41, "2025": 0.41, "2026": 0.41}, "calculatorSubtitle": "", "categoriesSubtitle": "", "calculatorEmptyHint": ""}
\.


--
-- Data for Name: company_documents; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.company_documents (id, company_id, file_name, original_name, mime_type, size_bytes, uploaded_by, deleted_at, created_at) FROM stdin;
\.


--
-- Data for Name: electricity_prices; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.electricity_prices (id, provider_name, service_type, location, price_per_kwh, date_recorded, updated_by, approved_at, approved_by, rejected_at, rejected_by, rejection_reason, status) FROM stdin;
\.


--
-- Data for Name: favorites; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.favorites (id, user_id, sector, category) FROM stdin;
\.


--
-- Data for Name: livestock_animal_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.livestock_animal_types (id, category_id, slug, name, name_somali, description, unit, legacy_animal_type, status, sort_order, created_at, updated_at, image_url) FROM stdin;
59381	1	haa	yes	haa	\N	head	CAMEL	INACTIVE	12	2026-09-08 22:22:15.818	2026-09-17 10:16:09.323	/uploads/livestock-categories/1789640081221-icon-512.jpg?v=1789640081226
37995	2	sac-4	sac	sac	\N	head	CATTLE	INACTIVE	9	2026-09-06 01:14:25.086	2026-09-26 00:04:14.022	\N
9	2	cow	Cow (Female)	Sac	\N	head	CATTLE	INACTIVE	1	2026-08-28 08:46:56.932	2026-09-26 00:04:14.036	\N
2885	3	wan	Ram (Male Sheep)	Wan	\N	head	GOAT	ACTIVE	2	2026-08-28 07:27:07.879	2026-09-09 16:18:49.504	\N
2887	3	caysan	Lamb (Young Sheep)	Caysan	\N	head	GOAT	ACTIVE	3	2026-08-28 07:27:07.998	2026-09-09 16:18:49.504	\N
2890	3	orgi	Young Sheep	Orgi	\N	head	GOAT	ACTIVE	4	2026-08-28 07:27:08.018	2026-09-09 16:18:49.504	\N
2893	3	neyl	Sheep (General)	Neyl	\N	head	GOAT	ACTIVE	5	2026-08-28 07:27:08.033	2026-09-09 16:18:49.504	\N
37500	2	sac-3	sac	sac	\N	head	CATTLE	INACTIVE	8	2026-09-06 01:04:36.239	2026-09-26 00:04:14.047	\N
2896	3	riyo	Buck (Male Goat)	Ri	\N	head	GOAT	INACTIVE	6	2026-08-28 07:27:08.052	2026-09-26 00:04:14.113	\N
3	1	young-camel	Young Camel	Qurbac	\N	head	CAMEL	INACTIVE	3	2026-08-28 08:46:56.932	2026-09-26 00:04:14.123	\N
57004	1	rati	Camel (General)	Rati	\N	head	CAMEL	INACTIVE	5	2026-09-07 09:03:59.312	2026-09-07 17:59:54.809	\N
19401	3	sabeen	Kid (Young Goat)	Sabeen	\N	head	GOAT	ACTIVE	8	2026-09-02 14:18:26.565	2026-09-07 17:59:54.88	\N
17401	2	haan	haan	haan	\N	head	CATTLE	INACTIVE	5	2026-09-02 10:26:26.957	2026-09-05 21:13:16.947	\N
5	1	awr	Male Camel	Awr	\N	head	CAMEL	ACTIVE	1	2026-08-28 08:46:56.932	2026-09-13 06:30:41.695	\N
4	1	hal	Female Camel (She-Camel)	Hal	\N	head	CAMEL	ACTIVE	2	2026-08-28 08:46:56.932	2026-09-13 06:30:41.702	\N
59375	1	qurbac	Young Camel	Qurbac	\N	head	CAMEL	ACTIVE	3	2026-09-07 18:07:09.57	2026-09-13 06:30:41.705	\N
2	1	qalin	Young Female Camel	Qalin	\N	head	CAMEL	ACTIVE	4	2026-08-28 08:46:56.932	2026-09-13 06:30:41.81	\N
1	1	baarqab	Breeding Male Camel	Baarqab	\N	head	CAMEL	ACTIVE	5	2026-08-28 08:46:56.932	2026-09-13 06:30:41.816	\N
36852	2	sac	Cow (Female)	Sac	\N	head	CATTLE	ACTIVE	1	2026-09-06 00:23:23.724	2026-09-13 06:30:41.824	\N
8	2	dibi	Bull (Male)	Dibi	\N	head	CATTLE	ACTIVE	2	2026-08-28 08:46:56.932	2026-09-13 06:30:41.963	\N
7	2	weyl	Calf (Young)	Weyl	\N	head	CATTLE	ACTIVE	3	2026-08-28 08:46:56.932	2026-09-13 06:30:41.969	\N
6	2	qaalin	Heifer (Young Female)	Qaalin	\N	head	CATTLE	ACTIVE	4	2026-08-28 08:46:56.932	2026-09-13 06:30:41.975	\N
19391	3	waxar	Doe (Female Goat)	Waxar	\N	head	GOAT	ACTIVE	7	2026-09-02 14:18:26.54	2026-09-13 06:30:42.073	\N
59377	1	bshh	bshh	ueeh	\N	head	CAMEL	INACTIVE	8	2026-09-07 18:13:36.898	2026-09-07 18:20:50.103	\N
59379	1	hhs	hhh	hhs	\N	head	CAMEL	INACTIVE	10	2026-09-08 22:01:08.508	2026-09-08 22:01:57.704	\N
59380	1	dd	de	dd	\N	head	CAMEL	INACTIVE	11	2026-09-08 22:10:01.373	2026-09-08 22:16:47.546	\N
2882	3	lax	Ewe (Female Sheep)	Lax	\N	head	GOAT	ACTIVE	1	2026-08-28 07:27:07.866	2026-09-09 16:18:49.504	\N
14	3	sheep	Sheep	Ido	\N	head	GOAT	INACTIVE	1	2026-08-28 08:46:56.932	2026-09-09 16:18:49.504	\N
38148	2	sac-5	sac	sac	\N	head	CATTLE	INACTIVE	10	2026-09-06 01:16:23.158	2026-09-26 00:04:14.058	\N
37100	2	sac-2	sac	sac	\N	head	CATTLE	INACTIVE	7	2026-09-06 00:30:01.921	2026-09-26 00:04:14.07	\N
10	3	lamb-kid	Lamb/Kid	Caysan	\N	head	GOAT	INACTIVE	5	2026-08-28 08:46:56.932	2026-09-26 00:04:14.088	\N
12	3	male-goat	Male Goat	Orgi	\N	head	GOAT	INACTIVE	3	2026-08-28 08:46:56.932	2026-09-26 00:04:14.103	\N
59378	1	young-camel-2	Young Camel	Qurbac	\N	head	CAMEL	INACTIVE	9	2026-09-07 18:14:17.885	2026-09-26 00:04:14.135	\N
13	3	ri	Buck (Male Goat)	Ri	\N	head	GOAT	ACTIVE	6	2026-08-28 08:46:56.932	2026-09-13 06:30:42.007	\N
19406	3	sumal	Goat (General)	Sumal	\N	head	GOAT	ACTIVE	9	2026-09-02 14:18:26.573	2026-09-07 17:59:54.885	\N
11	3	female-goat	Female Goat	Ri Dhedig	\N	head	GOAT	INACTIVE	4	2026-08-28 08:46:56.932	2026-09-07 17:59:54.891	\N
\.


--
-- Data for Name: livestock_broker_animal_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.livestock_broker_animal_types (broker_id, animal_type_id, created_at) FROM stdin;
22	1	2026-09-08 23:11:57.637
22	2	2026-09-08 23:11:57.646
22	4	2026-09-08 23:11:57.632
22	5	2026-09-08 23:11:57.607
22	59375	2026-09-13 06:30:41.728
23	6	2026-09-09 10:22:08.948
23	7	2026-09-09 10:22:08.943
23	8	2026-09-09 10:22:08.938
23	36852	2026-09-13 06:30:41.842
24	13	2026-09-13 06:30:42.026
24	2882	2026-09-09 11:57:09.701
24	2885	2026-09-09 11:57:09.663
24	2887	2026-09-09 11:57:09.669
24	2890	2026-09-09 11:57:09.674
24	2893	2026-09-09 11:57:09.681
24	19391	2026-09-09 11:57:09.691
24	19401	2026-09-09 11:57:09.697
24	19406	2026-09-09 11:57:09.705
25	6	2026-09-09 15:58:46.404
25	7	2026-09-09 15:58:46.402
25	8	2026-09-09 15:58:46.401
25	13	2026-09-13 06:30:42.039
25	2882	2026-09-09 15:58:46.421
25	2885	2026-09-09 15:58:46.406
25	2887	2026-09-09 15:58:46.410
25	2890	2026-09-09 15:58:46.412
25	2893	2026-09-09 15:58:46.413
25	19391	2026-09-09 15:58:46.415
25	19401	2026-09-09 15:58:46.416
25	19406	2026-09-09 15:58:46.424
25	36852	2026-09-13 06:30:41.855
26	1	2026-09-09 17:08:19.738
26	2	2026-09-09 17:08:19.756
26	4	2026-09-09 17:08:19.730
26	5	2026-09-09 17:08:19.724
26	6	2026-09-09 17:08:19.679
26	7	2026-09-09 17:08:19.673
26	8	2026-09-09 17:08:19.663
26	13	2026-09-13 06:30:42.052
26	2882	2026-09-09 17:08:19.762
26	2885	2026-09-09 17:08:19.609
26	2887	2026-09-09 17:08:19.618
26	2890	2026-09-09 17:08:19.627
26	2893	2026-09-09 17:08:19.635
26	19391	2026-09-09 17:08:19.702
26	19401	2026-09-09 17:08:19.709
26	19406	2026-09-09 17:08:19.789
26	36852	2026-09-13 06:30:41.868
26	59375	2026-09-13 06:30:41.764
27	1	2026-09-11 13:51:23.533
27	2	2026-09-11 13:51:23.549
27	4	2026-09-11 13:51:23.525
27	5	2026-09-11 13:51:23.519
27	6	2026-09-11 13:51:23.505
27	7	2026-09-11 13:51:23.499
27	8	2026-09-11 13:51:23.494
27	36852	2026-09-13 06:30:41.880
27	59375	2026-09-13 06:30:41.775
39	1	2026-09-25 23:42:36.921
39	2	2026-09-25 23:42:36.913
39	4	2026-09-25 23:42:36.892
39	5	2026-09-25 23:42:36.850
39	6	2026-09-25 23:42:36.954
39	7	2026-09-25 23:42:36.946
39	8	2026-09-25 23:42:36.937
39	13	2026-09-26 00:01:08.879
39	2882	2026-09-26 00:01:08.872
39	2885	2026-09-26 00:01:08.750
39	2887	2026-09-26 00:01:08.763
39	2890	2026-09-26 00:01:08.774
39	2893	2026-09-26 00:01:08.781
39	19391	2026-09-26 00:01:08.864
39	19401	2026-09-26 00:01:08.791
39	19406	2026-09-26 00:01:08.885
39	36852	2026-09-25 23:42:36.929
39	59375	2026-09-25 23:42:36.901
\.


--
-- Data for Name: livestock_broker_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.livestock_broker_categories (broker_id, category_id, created_at) FROM stdin;
22	1	2026-09-24 09:34:37.319
23	2	2026-09-24 09:34:37.344
24	3	2026-09-24 09:34:37.364
25	2	2026-09-24 09:34:37.385
25	3	2026-09-24 09:34:37.385
26	1	2026-09-24 09:34:37.405
26	2	2026-09-24 09:34:37.405
26	3	2026-09-24 09:34:37.405
27	1	2026-09-24 09:34:37.424
27	2	2026-09-24 09:34:37.424
39	1	2026-09-25 23:42:36.792
39	2	2026-09-25 23:42:36.831
39	3	2026-09-26 00:01:08.732
\.


--
-- Data for Name: livestock_broker_markets; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.livestock_broker_markets (broker_id, market_id, created_at) FROM stdin;
22	10	2026-09-24 09:34:37.307
23	7	2026-09-24 09:34:37.339
24	6	2026-09-24 09:34:37.360
25	8	2026-09-24 09:34:37.379
25	9	2026-09-24 09:34:37.379
26	6	2026-09-24 09:34:37.400
26	9	2026-09-24 09:34:37.400
26	10	2026-09-24 09:34:37.400
27	7	2026-09-24 09:34:37.420
27	8	2026-09-24 09:34:37.420
39	6	2026-09-26 00:01:08.682
39	7	2026-09-26 00:01:08.685
39	8	2026-09-26 00:01:08.696
39	9	2026-09-25 23:42:36.750
39	10	2026-09-25 23:42:36.767
\.


--
-- Data for Name: livestock_brokers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.livestock_brokers (id, name, email, phone, location, profile_picture, description, livestock_focus, status, market_id, deleted_at, created_at, updated_at, hero_title, broker_code, approval_status) FROM stdin;
22	Hana Abdikadir	haniabdikadir1@gmail.com	+252619643334	Medina Livestock Market, Medina, Mogadishu, Mogadishu, Banadir, Somalia	\N	\N	Camel Market Section	ACTIVE	10	\N	2026-01-01 10:00:00.000	2026-09-26 09:40:07.471	\N	LB-00022	APPROVED
23	Mohamed Hassan	mohamed@gmail.com	+252 615088596	Sinka dheer Livestock Market, Sinka Dheer, Mogadishu, Mogadishu, Banadir, Somalia	\N	\N	Cattle Market Section	ACTIVE	7	\N	2026-01-01 10:00:00.000	2026-01-01 10:00:00.000	\N	LB-00023	APPROVED
24	zahra ahmed	zahra@gmail.com	+252 617175998	Deniile livestock market, Dayniile, Mogadishu, Mogadishu, Banadir, Somalia	\N	\N	Goat Market Section	ACTIVE	6	\N	2026-01-01 10:00:00.000	2026-01-01 10:00:00.000	\N	LB-00024	APPROVED
25	elhan abdikadir	elhan@gmail.com	+252 615935334	Suuqa xoolaha Livestock Market, Suuqa Xoolaha, Mogadishu, Mogadishu, Banadir, Somalia	\N	\N	Cattle Market Section|Goat Market Section	ACTIVE	8	\N	2026-01-01 10:00:00.000	2026-01-01 10:00:00.000	\N	LB-00025	APPROVED
26	ismahaan abdikadir	ismahaan@gmail.com	+252 619235555	Dayax Livestock Market, Dayax, Mogadishu, Mogadishu, Banadir, Somalia	\N	\N	Camel Market Section|Cattle Market Section|Goat Market Section	ACTIVE	9	\N	2026-01-01 10:00:00.000	2026-01-01 10:00:00.000	\N	LB-00026	APPROVED
27	ahmed Abdikadir	ahmed@gmail.com	+252 615343033	Suuqa xoolaha Livestock Market, Suuqa Xoolaha, Mogadishu, Mogadishu, Banadir, Somalia	\N	\N	Camel Market Section|Cattle Market Section	ACTIVE	8	\N	2026-01-01 10:00:00.000	2026-09-25 05:36:36.649	\N	LB-00027	APPROVED
39	hana saaqle	hanisaa@gmail.com	+252619643334	Deniile livestock market, Sinka dheer Livestock Market, Dayax Livestock Market, Suuqa xoolaha Livestock Market, Medina Livestock Market, Dayniile, Mogadishu, Mogadishu, Banadir, Somalia	\N	\N	Camel Market Section|Cattle Market Section|Goat Market Section	ACTIVE	6	\N	2026-09-25 23:42:36.480	2026-09-26 00:01:08.705	\N	LB-00039	APPROVED
\.


--
-- Data for Name: livestock_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.livestock_categories (id, slug, name, name_somali, description, species, status, sort_order, created_at, updated_at, image_url) FROM stdin;
2089	iman	iman	iman	\N	CAMEL	INACTIVE	4	2026-08-30 17:48:57.668	2026-09-05 21:13:43.483	\N
2	loda	Cattle	Lo'		CATTLE	ACTIVE	2	2026-08-28 08:46:56.932	2026-09-26 00:04:13.997	/uploads/livestock-hero/hero-loda-1788693379653.jpg
3	arri	Sheep & Goats	Ari & Ido	Follow goat and sheep prices in Mogadishu marketsss.	GOAT	ACTIVE	3	2026-08-28 08:46:56.932	2026-09-07 17:59:54.842	/uploads/livestock-hero/hero-arri-1788693647576.jpg
2150	goass	goass	jjjj	\N	POULTRY	INACTIVE	5	2026-08-30 18:07:14.835	2026-09-05 21:09:38.49	\N
1	geel	Camels	Geel		CAMEL	ACTIVE	1	2026-08-28 08:46:56.932	2026-09-17 10:14:01.981	/uploads/livestock-hero/hero-geel-1788692892139.jpg
\.


--
-- Data for Name: livestock_market_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.livestock_market_categories (market_id, category_id, created_at) FROM stdin;
8	1	2026-08-29 18:00:19.005
8	2	2026-08-29 18:00:19.013
8	3	2026-08-29 18:00:19.024
6	1	2026-08-29 18:00:19.033
6	2	2026-08-29 18:00:19.041
6	3	2026-08-29 18:00:19.047
7	1	2026-08-29 18:00:19.054
7	2	2026-08-29 18:00:19.062
7	3	2026-08-29 18:00:19.071
9	1	2026-08-29 18:00:19.078
9	2	2026-08-29 18:00:19.084
9	3	2026-08-29 18:00:19.092
10	1	2026-08-29 18:00:19.1
10	2	2026-08-29 18:00:19.108
10	3	2026-08-29 18:00:19.115
\.


--
-- Data for Name: livestock_prices; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.livestock_prices (id, animal_type, market_location, price, date_recorded, updated_by, approved_at, approved_by, rejected_at, rejected_by, rejection_reason, status, broker_id, category, created_at, currency, deleted_at, description, market_id, updated_at, livestock_category_id, livestock_type_id, unit, age_class, origin_place) FROM stdin;
19904	CAMEL	Sinka dheer Livestock Market	11.00	2026-09-25 17:28:12.02	81	2026-09-25 17:28:19.064	1	\N	\N	\N	APPROVED	27	FIELD_BIRIMO_AWR	2026-09-25 17:28:12.023	USD	\N	Awr	7	2026-09-25 17:28:19.066	1	5	\N	1	gedo
19425	CAMEL	Medina Livestock Market	1135.00	2026-01-02 10:00:00	76	2026-01-02 10:00:00	1	\N	\N	\N	APPROVED	22	FIELD_BIRIMO_AWR	2026-09-24 08:29:55.035	USD	\N	Awr	10	2026-09-24 08:29:55.035	1	5	head	1jir	Gedo
19426	CAMEL	Medina Livestock Market	1085.00	2026-01-04 15:50:55.462	76	2026-01-04 15:50:55.462	1	\N	\N	\N	APPROVED	22	FIELD_SUGUNTO_AWR	2026-09-24 08:29:55.035	USD	\N	Awr	10	2026-09-24 08:29:55.035	1	5	head	1jir	Gedo
19427	CAMEL	Medina Livestock Market	1125.00	2026-01-06 21:41:50.924	76	2026-01-06 21:41:50.924	1	\N	\N	\N	APPROVED	22	FIELD_BIRIMO_AWR	2026-09-24 08:29:55.035	USD	\N	Awr	10	2026-09-24 08:29:55.035	1	5	head	1.5jir	Bay
19428	CAMEL	Medina Livestock Market	1075.00	2026-01-09 03:32:46.387	76	2026-01-09 03:32:46.387	1	\N	\N	\N	APPROVED	22	FIELD_SUGUNTO_AWR	2026-09-24 08:29:55.035	USD	\N	Awr	10	2026-09-24 08:29:55.035	1	5	head	1.5jir	Bay
19429	CAMEL	Medina Livestock Market	1165.00	2026-01-11 09:23:41.849	76	2026-01-11 09:23:41.849	1	\N	\N	\N	APPROVED	22	FIELD_BIRIMO_AWR	2026-09-24 08:29:55.035	USD	\N	Awr	10	2026-09-24 08:29:55.035	1	5	head	2jir	Bakool
19430	CAMEL	Medina Livestock Market	1115.00	2026-01-13 15:14:37.311	76	2026-01-13 15:14:37.311	1	\N	\N	\N	APPROVED	22	FIELD_SUGUNTO_AWR	2026-09-24 08:29:55.035	USD	\N	Awr	10	2026-09-24 08:29:55.035	1	5	head	2jir	Bakool
19431	CAMEL	Medina Livestock Market	1145.00	2026-01-15 21:05:32.773	76	2026-01-15 21:05:32.773	1	\N	\N	\N	APPROVED	22	FIELD_BIRIMO_AWR	2026-09-24 08:29:55.035	USD	\N	Awr	10	2026-09-24 08:29:55.035	1	5	head	3jir	Hiiraan
19432	CAMEL	Medina Livestock Market	1095.00	2026-01-18 02:56:28.235	76	2026-01-18 02:56:28.235	1	\N	\N	\N	APPROVED	22	FIELD_SUGUNTO_AWR	2026-09-24 08:29:55.035	USD	\N	Awr	10	2026-09-24 08:29:55.035	1	5	head	3jir	Hiiraan
19433	CAMEL	Medina Livestock Market	1335.00	2026-01-20 08:47:23.697	76	2026-01-20 08:47:23.697	1	\N	\N	\N	APPROVED	22	FIELD_BIRIMO_HAL	2026-09-24 08:29:55.035	USD	\N	Hal	10	2026-09-24 08:29:55.035	1	4	head	1jir	Gedo
19434	CAMEL	Medina Livestock Market	1285.00	2026-01-22 14:38:19.16	76	2026-01-22 14:38:19.16	1	\N	\N	\N	APPROVED	22	FIELD_SUGUNTO_HAL	2026-09-24 08:29:55.035	USD	\N	Hal	10	2026-09-24 08:29:55.035	1	4	head	1jir	Gedo
19435	CAMEL	Medina Livestock Market	1325.00	2026-01-24 20:29:14.622	76	2026-01-24 20:29:14.622	1	\N	\N	\N	APPROVED	22	FIELD_BIRIMO_HAL	2026-09-24 08:29:55.035	USD	\N	Hal	10	2026-09-24 08:29:55.035	1	4	head	1.5jir	Bay
19436	CAMEL	Medina Livestock Market	1275.00	2026-01-27 02:20:10.084	76	2026-01-27 02:20:10.084	1	\N	\N	\N	APPROVED	22	FIELD_SUGUNTO_HAL	2026-09-24 08:29:55.035	USD	\N	Hal	10	2026-09-24 08:29:55.035	1	4	head	1.5jir	Bay
19437	CAMEL	Medina Livestock Market	1365.00	2026-01-29 08:11:05.546	76	2026-01-29 08:11:05.546	1	\N	\N	\N	APPROVED	22	FIELD_BIRIMO_HAL	2026-09-24 08:29:55.035	USD	\N	Hal	10	2026-09-24 08:29:55.035	1	4	head	2jir	Bakool
19438	CAMEL	Medina Livestock Market	1315.00	2026-01-31 14:02:01.008	76	2026-01-31 14:02:01.008	1	\N	\N	\N	APPROVED	22	FIELD_SUGUNTO_HAL	2026-09-24 08:29:55.035	USD	\N	Hal	10	2026-09-24 08:29:55.035	1	4	head	2jir	Bakool
19439	CAMEL	Medina Livestock Market	1345.00	2026-02-02 19:52:56.471	76	2026-02-02 19:52:56.471	1	\N	\N	\N	APPROVED	22	FIELD_BIRIMO_HAL	2026-09-24 08:29:55.035	USD	\N	Hal	10	2026-09-24 08:29:55.035	1	4	head	3jir	Hiiraan
19440	CAMEL	Medina Livestock Market	1295.00	2026-02-05 01:43:51.933	76	2026-02-05 01:43:51.933	1	\N	\N	\N	APPROVED	22	FIELD_SUGUNTO_HAL	2026-09-24 08:29:55.035	USD	\N	Hal	10	2026-09-24 08:29:55.035	1	4	head	3jir	Hiiraan
19441	CAMEL	Medina Livestock Market	435.00	2026-02-07 07:34:47.395	76	2026-02-07 07:34:47.395	1	\N	\N	\N	APPROVED	22	FIELD_BIRIMO_QURBAC	2026-09-24 08:29:55.035	USD	\N	Qurbac	10	2026-09-24 08:29:55.035	1	59375	head	1jir	Gedo
19442	CAMEL	Medina Livestock Market	385.00	2026-02-09 13:25:42.857	76	2026-02-09 13:25:42.857	1	\N	\N	\N	APPROVED	22	FIELD_SUGUNTO_QURBAC	2026-09-24 08:29:55.035	USD	\N	Qurbac	10	2026-09-24 08:29:55.035	1	59375	head	1jir	Gedo
19443	CAMEL	Medina Livestock Market	425.00	2026-02-11 19:16:38.319	76	2026-02-11 19:16:38.319	1	\N	\N	\N	APPROVED	22	FIELD_BIRIMO_QURBAC	2026-09-24 08:29:55.035	USD	\N	Qurbac	10	2026-09-24 08:29:55.035	1	59375	head	1.5jir	Bay
19444	CAMEL	Medina Livestock Market	375.00	2026-02-14 01:07:33.782	76	2026-02-14 01:07:33.782	1	\N	\N	\N	APPROVED	22	FIELD_SUGUNTO_QURBAC	2026-09-24 08:29:55.035	USD	\N	Qurbac	10	2026-09-24 08:29:55.035	1	59375	head	1.5jir	Bay
19445	CAMEL	Medina Livestock Market	465.00	2026-02-16 06:58:29.244	76	2026-02-16 06:58:29.244	1	\N	\N	\N	APPROVED	22	FIELD_BIRIMO_QURBAC	2026-09-24 08:29:55.035	USD	\N	Qurbac	10	2026-09-24 08:29:55.035	1	59375	head	2jir	Bakool
19446	CAMEL	Medina Livestock Market	415.00	2026-02-18 12:49:24.706	76	2026-02-18 12:49:24.706	1	\N	\N	\N	APPROVED	22	FIELD_SUGUNTO_QURBAC	2026-09-24 08:29:55.035	USD	\N	Qurbac	10	2026-09-24 08:29:55.035	1	59375	head	2jir	Bakool
19447	CAMEL	Medina Livestock Market	445.00	2026-02-20 18:40:20.168	76	2026-02-20 18:40:20.168	1	\N	\N	\N	APPROVED	22	FIELD_BIRIMO_QURBAC	2026-09-24 08:29:55.035	USD	\N	Qurbac	10	2026-09-24 08:29:55.035	1	59375	head	3jir	Hiiraan
19448	CAMEL	Medina Livestock Market	395.00	2026-02-23 00:31:15.63	76	2026-02-23 00:31:15.63	1	\N	\N	\N	APPROVED	22	FIELD_SUGUNTO_QURBAC	2026-09-24 08:29:55.035	USD	\N	Qurbac	10	2026-09-24 08:29:55.035	1	59375	head	3jir	Hiiraan
19449	CAMEL	Medina Livestock Market	585.00	2026-02-25 06:22:11.092	76	2026-02-25 06:22:11.092	1	\N	\N	\N	APPROVED	22	FIELD_BIRIMO_QALIN	2026-09-24 08:29:55.035	USD	\N	Qalin	10	2026-09-24 08:29:55.035	1	2	head	1jir	Gedo
19450	CAMEL	Medina Livestock Market	535.00	2026-02-27 12:13:06.555	76	2026-02-27 12:13:06.555	1	\N	\N	\N	APPROVED	22	FIELD_SUGUNTO_QALIN	2026-09-24 08:29:55.035	USD	\N	Qalin	10	2026-09-24 08:29:55.035	1	2	head	1jir	Gedo
19451	CAMEL	Medina Livestock Market	575.00	2026-03-01 18:04:02.017	76	2026-03-01 18:04:02.017	1	\N	\N	\N	APPROVED	22	FIELD_BIRIMO_QALIN	2026-09-24 08:29:55.035	USD	\N	Qalin	10	2026-09-24 08:29:55.035	1	2	head	1.5jir	Bay
19452	CAMEL	Medina Livestock Market	525.00	2026-03-03 23:54:57.479	76	2026-03-03 23:54:57.479	1	\N	\N	\N	APPROVED	22	FIELD_SUGUNTO_QALIN	2026-09-24 08:29:55.035	USD	\N	Qalin	10	2026-09-24 08:29:55.035	1	2	head	1.5jir	Bay
19453	CAMEL	Medina Livestock Market	615.00	2026-03-06 05:45:52.941	76	2026-03-06 05:45:52.941	1	\N	\N	\N	APPROVED	22	FIELD_BIRIMO_QALIN	2026-09-24 08:29:55.035	USD	\N	Qalin	10	2026-09-24 08:29:55.035	1	2	head	2jir	Bakool
19454	CAMEL	Medina Livestock Market	565.00	2026-03-08 11:36:48.403	76	2026-03-08 11:36:48.403	1	\N	\N	\N	APPROVED	22	FIELD_SUGUNTO_QALIN	2026-09-24 08:29:55.035	USD	\N	Qalin	10	2026-09-24 08:29:55.035	1	2	head	2jir	Bakool
19455	CAMEL	Medina Livestock Market	595.00	2026-03-10 17:27:43.866	76	2026-03-10 17:27:43.866	1	\N	\N	\N	APPROVED	22	FIELD_BIRIMO_QALIN	2026-09-24 08:29:55.035	USD	\N	Qalin	10	2026-09-24 08:29:55.035	1	2	head	3jir	Hiiraan
19456	CAMEL	Medina Livestock Market	545.00	2026-03-12 23:18:39.328	76	2026-03-12 23:18:39.328	1	\N	\N	\N	APPROVED	22	FIELD_SUGUNTO_QALIN	2026-09-24 08:29:55.035	USD	\N	Qalin	10	2026-09-24 08:29:55.035	1	2	head	3jir	Hiiraan
19457	CAMEL	Medina Livestock Market	2160.00	2026-03-15 05:09:34.79	76	2026-03-15 05:09:34.79	1	\N	\N	\N	APPROVED	22	FIELD_BIRIMO_BAARQAB	2026-09-24 08:29:55.035	USD	\N	Baarqab	10	2026-09-24 08:29:55.035	1	1	head	1jir	Gedo
19458	CAMEL	Medina Livestock Market	2110.00	2026-03-17 11:00:30.252	76	2026-03-17 11:00:30.252	1	\N	\N	\N	APPROVED	22	FIELD_SUGUNTO_BAARQAB	2026-09-24 08:29:55.035	USD	\N	Baarqab	10	2026-09-24 08:29:55.035	1	1	head	1jir	Gedo
19459	CAMEL	Medina Livestock Market	2150.00	2026-03-19 16:51:25.714	76	2026-03-19 16:51:25.714	1	\N	\N	\N	APPROVED	22	FIELD_BIRIMO_BAARQAB	2026-09-24 08:29:55.035	USD	\N	Baarqab	10	2026-09-24 08:29:55.035	1	1	head	1.5jir	Bay
19460	CAMEL	Medina Livestock Market	2100.00	2026-03-21 22:42:21.176	76	2026-03-21 22:42:21.176	1	\N	\N	\N	APPROVED	22	FIELD_SUGUNTO_BAARQAB	2026-09-24 08:29:55.035	USD	\N	Baarqab	10	2026-09-24 08:29:55.035	1	1	head	1.5jir	Bay
19461	CAMEL	Medina Livestock Market	2190.00	2026-03-24 04:33:16.639	76	2026-03-24 04:33:16.639	1	\N	\N	\N	APPROVED	22	FIELD_BIRIMO_BAARQAB	2026-09-24 08:29:55.035	USD	\N	Baarqab	10	2026-09-24 08:29:55.035	1	1	head	2jir	Bakool
19462	CAMEL	Medina Livestock Market	2140.00	2026-03-26 10:24:12.101	76	2026-03-26 10:24:12.101	1	\N	\N	\N	APPROVED	22	FIELD_SUGUNTO_BAARQAB	2026-09-24 08:29:55.035	USD	\N	Baarqab	10	2026-09-24 08:29:55.035	1	1	head	2jir	Bakool
19463	CAMEL	Medina Livestock Market	2170.00	2026-03-28 16:15:07.563	76	2026-03-28 16:15:07.563	1	\N	\N	\N	APPROVED	22	FIELD_BIRIMO_BAARQAB	2026-09-24 08:29:55.035	USD	\N	Baarqab	10	2026-09-24 08:29:55.035	1	1	head	3jir	Hiiraan
19464	CAMEL	Medina Livestock Market	2120.00	2026-03-30 22:06:03.025	76	2026-03-30 22:06:03.025	1	\N	\N	\N	APPROVED	22	FIELD_SUGUNTO_BAARQAB	2026-09-24 08:29:55.035	USD	\N	Baarqab	10	2026-09-24 08:29:55.035	1	1	head	3jir	Hiiraan
19465	CAMEL	Dayax Livestock Market	1115.00	2026-04-02 03:56:58.487	80	2026-04-02 03:56:58.487	1	\N	\N	\N	APPROVED	26	FIELD_BIRIMO_AWR	2026-09-24 08:29:55.035	USD	\N	Awr	9	2026-09-24 08:29:55.035	1	5	head	1.5jir	Gedo
19466	CAMEL	Dayax Livestock Market	1065.00	2026-04-04 09:47:53.95	80	2026-04-04 09:47:53.95	1	\N	\N	\N	APPROVED	26	FIELD_SUGUNTO_AWR	2026-09-24 08:29:55.035	USD	\N	Awr	9	2026-09-24 08:29:55.035	1	5	head	1.5jir	Gedo
19467	CAMEL	Dayax Livestock Market	1110.00	2026-04-06 15:38:49.412	80	2026-04-06 15:38:49.412	1	\N	\N	\N	APPROVED	26	FIELD_BIRIMO_AWR	2026-09-24 08:29:55.035	USD	\N	Awr	9	2026-09-24 08:29:55.035	1	5	head	2jir	Bay
19468	CAMEL	Dayax Livestock Market	1060.00	2026-04-08 21:29:44.874	80	2026-04-08 21:29:44.874	1	\N	\N	\N	APPROVED	26	FIELD_SUGUNTO_AWR	2026-09-24 08:29:55.035	USD	\N	Awr	9	2026-09-24 08:29:55.035	1	5	head	2jir	Bay
19469	CAMEL	Dayax Livestock Market	1145.00	2026-04-11 03:20:40.336	80	2026-04-11 03:20:40.336	1	\N	\N	\N	APPROVED	26	FIELD_BIRIMO_AWR	2026-09-24 08:29:55.035	USD	\N	Awr	9	2026-09-24 08:29:55.035	1	5	head	3jir	Bakool
19470	CAMEL	Dayax Livestock Market	1095.00	2026-04-13 09:11:35.798	80	2026-04-13 09:11:35.798	1	\N	\N	\N	APPROVED	26	FIELD_SUGUNTO_AWR	2026-09-24 08:29:55.035	USD	\N	Awr	9	2026-09-24 08:29:55.035	1	5	head	3jir	Bakool
19471	CAMEL	Dayax Livestock Market	1040.00	2026-04-15 15:02:31.261	80	2026-04-15 15:02:31.261	1	\N	\N	\N	APPROVED	26	FIELD_BIRIMO_AWR	2026-09-24 08:29:55.035	USD	\N	Awr	9	2026-09-24 08:29:55.035	1	5	head	1jir	Hiiraan
19472	CAMEL	Dayax Livestock Market	990.00	2026-04-17 20:53:26.723	80	2026-04-17 20:53:26.723	1	\N	\N	\N	APPROVED	26	FIELD_SUGUNTO_AWR	2026-09-24 08:29:55.035	USD	\N	Awr	9	2026-09-24 08:29:55.035	1	5	head	1jir	Hiiraan
19473	CAMEL	Dayax Livestock Market	1315.00	2026-04-20 02:44:22.185	80	2026-04-20 02:44:22.185	1	\N	\N	\N	APPROVED	26	FIELD_BIRIMO_HAL	2026-09-24 08:29:55.035	USD	\N	Hal	9	2026-09-24 08:29:55.035	1	4	head	1.5jir	Gedo
19474	CAMEL	Dayax Livestock Market	1265.00	2026-04-22 08:35:17.647	80	2026-04-22 08:35:17.647	1	\N	\N	\N	APPROVED	26	FIELD_SUGUNTO_HAL	2026-09-24 08:29:55.035	USD	\N	Hal	9	2026-09-24 08:29:55.035	1	4	head	1.5jir	Gedo
19475	CAMEL	Dayax Livestock Market	1310.00	2026-04-24 14:26:13.109	80	2026-04-24 14:26:13.109	1	\N	\N	\N	APPROVED	26	FIELD_BIRIMO_HAL	2026-09-24 08:29:55.035	USD	\N	Hal	9	2026-09-24 08:29:55.035	1	4	head	2jir	Bay
19476	CAMEL	Dayax Livestock Market	1260.00	2026-04-26 20:17:08.571	80	2026-04-26 20:17:08.571	1	\N	\N	\N	APPROVED	26	FIELD_SUGUNTO_HAL	2026-09-24 08:29:55.035	USD	\N	Hal	9	2026-09-24 08:29:55.035	1	4	head	2jir	Bay
19477	CAMEL	Dayax Livestock Market	1345.00	2026-04-29 02:08:04.034	80	2026-04-29 02:08:04.034	1	\N	\N	\N	APPROVED	26	FIELD_BIRIMO_HAL	2026-09-24 08:29:55.035	USD	\N	Hal	9	2026-09-24 08:29:55.035	1	4	head	3jir	Bakool
19478	CAMEL	Dayax Livestock Market	1295.00	2026-05-01 07:58:59.496	80	2026-05-01 07:58:59.496	1	\N	\N	\N	APPROVED	26	FIELD_SUGUNTO_HAL	2026-09-24 08:29:55.035	USD	\N	Hal	9	2026-09-24 08:29:55.035	1	4	head	3jir	Bakool
19479	CAMEL	Dayax Livestock Market	1240.00	2026-05-03 13:49:54.958	80	2026-05-03 13:49:54.958	1	\N	\N	\N	APPROVED	26	FIELD_BIRIMO_HAL	2026-09-24 08:29:55.035	USD	\N	Hal	9	2026-09-24 08:29:55.035	1	4	head	1jir	Hiiraan
19480	CAMEL	Dayax Livestock Market	1190.00	2026-05-05 19:40:50.42	80	2026-05-05 19:40:50.42	1	\N	\N	\N	APPROVED	26	FIELD_SUGUNTO_HAL	2026-09-24 08:29:55.035	USD	\N	Hal	9	2026-09-24 08:29:55.035	1	4	head	1jir	Hiiraan
19481	CAMEL	Dayax Livestock Market	415.00	2026-05-08 01:31:45.882	80	2026-05-08 01:31:45.882	1	\N	\N	\N	APPROVED	26	FIELD_BIRIMO_QURBAC	2026-09-24 08:29:55.035	USD	\N	Qurbac	9	2026-09-24 08:29:55.035	1	59375	head	1.5jir	Gedo
19482	CAMEL	Dayax Livestock Market	365.00	2026-05-10 07:22:41.345	80	2026-05-10 07:22:41.345	1	\N	\N	\N	APPROVED	26	FIELD_SUGUNTO_QURBAC	2026-09-24 08:29:55.035	USD	\N	Qurbac	9	2026-09-24 08:29:55.035	1	59375	head	1.5jir	Gedo
19483	CAMEL	Dayax Livestock Market	410.00	2026-05-12 13:13:36.807	80	2026-05-12 13:13:36.807	1	\N	\N	\N	APPROVED	26	FIELD_BIRIMO_QURBAC	2026-09-24 08:29:55.035	USD	\N	Qurbac	9	2026-09-24 08:29:55.035	1	59375	head	2jir	Bay
19484	CAMEL	Dayax Livestock Market	360.00	2026-05-14 19:04:32.269	80	2026-05-14 19:04:32.269	1	\N	\N	\N	APPROVED	26	FIELD_SUGUNTO_QURBAC	2026-09-24 08:29:55.035	USD	\N	Qurbac	9	2026-09-24 08:29:55.035	1	59375	head	2jir	Bay
19485	CAMEL	Dayax Livestock Market	445.00	2026-05-17 00:55:27.731	80	2026-05-17 00:55:27.731	1	\N	\N	\N	APPROVED	26	FIELD_BIRIMO_QURBAC	2026-09-24 08:29:55.035	USD	\N	Qurbac	9	2026-09-24 08:29:55.035	1	59375	head	3jir	Bakool
19486	CAMEL	Dayax Livestock Market	395.00	2026-05-19 06:46:23.193	80	2026-05-19 06:46:23.193	1	\N	\N	\N	APPROVED	26	FIELD_SUGUNTO_QURBAC	2026-09-24 08:29:55.035	USD	\N	Qurbac	9	2026-09-24 08:29:55.035	1	59375	head	3jir	Bakool
19487	CAMEL	Dayax Livestock Market	340.00	2026-05-21 12:37:18.655	80	2026-05-21 12:37:18.655	1	\N	\N	\N	APPROVED	26	FIELD_BIRIMO_QURBAC	2026-09-24 08:29:55.035	USD	\N	Qurbac	9	2026-09-24 08:29:55.035	1	59375	head	1jir	Hiiraan
19488	CAMEL	Dayax Livestock Market	290.00	2026-05-23 18:28:14.118	80	2026-05-23 18:28:14.118	1	\N	\N	\N	APPROVED	26	FIELD_SUGUNTO_QURBAC	2026-09-24 08:29:55.035	USD	\N	Qurbac	9	2026-09-24 08:29:55.035	1	59375	head	1jir	Hiiraan
19489	CAMEL	Dayax Livestock Market	565.00	2026-05-26 00:19:09.58	80	2026-05-26 00:19:09.58	1	\N	\N	\N	APPROVED	26	FIELD_BIRIMO_QALIN	2026-09-24 08:29:55.035	USD	\N	Qalin	9	2026-09-24 08:29:55.035	1	2	head	1.5jir	Gedo
19490	CAMEL	Dayax Livestock Market	515.00	2026-05-28 06:10:05.042	80	2026-05-28 06:10:05.042	1	\N	\N	\N	APPROVED	26	FIELD_SUGUNTO_QALIN	2026-09-24 08:29:55.035	USD	\N	Qalin	9	2026-09-24 08:29:55.035	1	2	head	1.5jir	Gedo
19491	CAMEL	Dayax Livestock Market	560.00	2026-05-30 12:01:00.504	80	2026-05-30 12:01:00.504	1	\N	\N	\N	APPROVED	26	FIELD_BIRIMO_QALIN	2026-09-24 08:29:55.035	USD	\N	Qalin	9	2026-09-24 08:29:55.035	1	2	head	2jir	Bay
19492	CAMEL	Dayax Livestock Market	510.00	2026-06-01 17:51:55.966	80	2026-06-01 17:51:55.966	1	\N	\N	\N	APPROVED	26	FIELD_SUGUNTO_QALIN	2026-09-24 08:29:55.035	USD	\N	Qalin	9	2026-09-24 08:29:55.035	1	2	head	2jir	Bay
19493	CAMEL	Dayax Livestock Market	595.00	2026-06-03 23:42:51.429	80	2026-06-03 23:42:51.429	1	\N	\N	\N	APPROVED	26	FIELD_BIRIMO_QALIN	2026-09-24 08:29:55.035	USD	\N	Qalin	9	2026-09-24 08:29:55.035	1	2	head	3jir	Bakool
19494	CAMEL	Dayax Livestock Market	545.00	2026-06-06 05:33:46.891	80	2026-06-06 05:33:46.891	1	\N	\N	\N	APPROVED	26	FIELD_SUGUNTO_QALIN	2026-09-24 08:29:55.035	USD	\N	Qalin	9	2026-09-24 08:29:55.035	1	2	head	3jir	Bakool
19495	CAMEL	Dayax Livestock Market	490.00	2026-06-08 11:24:42.353	80	2026-06-08 11:24:42.353	1	\N	\N	\N	APPROVED	26	FIELD_BIRIMO_QALIN	2026-09-24 08:29:55.035	USD	\N	Qalin	9	2026-09-24 08:29:55.035	1	2	head	1jir	Hiiraan
19496	CAMEL	Dayax Livestock Market	440.00	2026-06-10 17:15:37.815	80	2026-06-10 17:15:37.815	1	\N	\N	\N	APPROVED	26	FIELD_SUGUNTO_QALIN	2026-09-24 08:29:55.035	USD	\N	Qalin	9	2026-09-24 08:29:55.035	1	2	head	1jir	Hiiraan
19497	CAMEL	Dayax Livestock Market	2140.00	2026-06-12 23:06:33.277	80	2026-06-12 23:06:33.277	1	\N	\N	\N	APPROVED	26	FIELD_BIRIMO_BAARQAB	2026-09-24 08:29:55.035	USD	\N	Baarqab	9	2026-09-24 08:29:55.035	1	1	head	1.5jir	Gedo
19498	CAMEL	Dayax Livestock Market	2090.00	2026-06-15 04:57:28.739	80	2026-06-15 04:57:28.739	1	\N	\N	\N	APPROVED	26	FIELD_SUGUNTO_BAARQAB	2026-09-24 08:29:55.035	USD	\N	Baarqab	9	2026-09-24 08:29:55.035	1	1	head	1.5jir	Gedo
19499	CAMEL	Dayax Livestock Market	2135.00	2026-06-17 10:48:24.202	80	2026-06-17 10:48:24.202	1	\N	\N	\N	APPROVED	26	FIELD_BIRIMO_BAARQAB	2026-09-24 08:29:55.035	USD	\N	Baarqab	9	2026-09-24 08:29:55.035	1	1	head	2jir	Bay
19500	CAMEL	Dayax Livestock Market	2085.00	2026-06-19 16:39:19.664	80	2026-06-19 16:39:19.664	1	\N	\N	\N	APPROVED	26	FIELD_SUGUNTO_BAARQAB	2026-09-24 08:29:55.035	USD	\N	Baarqab	9	2026-09-24 08:29:55.035	1	1	head	2jir	Bay
19501	CAMEL	Dayax Livestock Market	2170.00	2026-06-21 22:30:15.126	80	2026-06-21 22:30:15.126	1	\N	\N	\N	APPROVED	26	FIELD_BIRIMO_BAARQAB	2026-09-24 08:29:55.035	USD	\N	Baarqab	9	2026-09-24 08:29:55.035	1	1	head	3jir	Bakool
19502	CAMEL	Dayax Livestock Market	2120.00	2026-06-24 04:21:10.588	80	2026-06-24 04:21:10.588	1	\N	\N	\N	APPROVED	26	FIELD_SUGUNTO_BAARQAB	2026-09-24 08:29:55.035	USD	\N	Baarqab	9	2026-09-24 08:29:55.035	1	1	head	3jir	Bakool
19503	CAMEL	Dayax Livestock Market	2065.00	2026-06-26 10:12:06.05	80	2026-06-26 10:12:06.05	1	\N	\N	\N	APPROVED	26	FIELD_BIRIMO_BAARQAB	2026-09-24 08:29:55.035	USD	\N	Baarqab	9	2026-09-24 08:29:55.035	1	1	head	1jir	Hiiraan
19504	CAMEL	Dayax Livestock Market	2015.00	2026-06-28 16:03:01.513	80	2026-06-28 16:03:01.513	1	\N	\N	\N	APPROVED	26	FIELD_SUGUNTO_BAARQAB	2026-09-24 08:29:55.035	USD	\N	Baarqab	9	2026-09-24 08:29:55.035	1	1	head	1jir	Hiiraan
19507	CAMEL	Suuqa xoolaha Livestock Market	1220.00	2026-07-05 09:35:47.899	81	2026-07-05 09:35:47.899	1	\N	\N	\N	APPROVED	27	FIELD_BIRIMO_AWR	2026-09-24 08:29:55.035	USD	\N	Awr	8	2026-09-24 08:29:55.035	1	5	head	3jir	Bay
19508	CAMEL	Suuqa xoolaha Livestock Market	1170.00	2026-07-07 15:26:43.361	81	2026-07-07 15:26:43.361	1	\N	\N	\N	APPROVED	27	FIELD_SUGUNTO_AWR	2026-09-24 08:29:55.035	USD	\N	Awr	8	2026-09-24 08:29:55.035	1	5	head	3jir	Bay
19509	CAMEL	Suuqa xoolaha Livestock Market	1170.00	2026-07-09 21:17:38.824	81	2026-07-09 21:17:38.824	1	\N	\N	\N	APPROVED	27	FIELD_BIRIMO_AWR	2026-09-24 08:29:55.035	USD	\N	Awr	8	2026-09-24 08:29:55.035	1	5	head	1jir	Bakool
19510	CAMEL	Suuqa xoolaha Livestock Market	1120.00	2026-07-12 03:08:34.286	81	2026-07-12 03:08:34.286	1	\N	\N	\N	APPROVED	27	FIELD_SUGUNTO_AWR	2026-09-24 08:29:55.035	USD	\N	Awr	8	2026-09-24 08:29:55.035	1	5	head	1jir	Bakool
19511	CAMEL	Suuqa xoolaha Livestock Market	1150.00	2026-07-14 08:59:29.748	81	2026-07-14 08:59:29.748	1	\N	\N	\N	APPROVED	27	FIELD_BIRIMO_AWR	2026-09-24 08:29:55.035	USD	\N	Awr	8	2026-09-24 08:29:55.035	1	5	head	1.5jir	Hiiraan
19512	CAMEL	Suuqa xoolaha Livestock Market	1100.00	2026-07-16 14:50:25.21	81	2026-07-16 14:50:25.21	1	\N	\N	\N	APPROVED	27	FIELD_SUGUNTO_AWR	2026-09-24 08:29:55.035	USD	\N	Awr	8	2026-09-24 08:29:55.035	1	5	head	1.5jir	Hiiraan
19513	CAMEL	Suuqa xoolaha Livestock Market	1430.00	2026-07-18 20:41:20.672	81	2026-07-18 20:41:20.672	1	\N	\N	\N	APPROVED	27	FIELD_BIRIMO_HAL	2026-09-24 08:29:55.035	USD	\N	Hal	8	2026-09-24 08:29:55.035	1	4	head	2jir	Gedo
19514	CAMEL	Suuqa xoolaha Livestock Market	1380.00	2026-07-21 02:32:16.134	81	2026-07-21 02:32:16.134	1	\N	\N	\N	APPROVED	27	FIELD_SUGUNTO_HAL	2026-09-24 08:29:55.035	USD	\N	Hal	8	2026-09-24 08:29:55.035	1	4	head	2jir	Gedo
19515	CAMEL	Suuqa xoolaha Livestock Market	1420.00	2026-07-23 08:23:11.597	81	2026-07-23 08:23:11.597	1	\N	\N	\N	APPROVED	27	FIELD_BIRIMO_HAL	2026-09-24 08:29:55.035	USD	\N	Hal	8	2026-09-24 08:29:55.035	1	4	head	3jir	Bay
19516	CAMEL	Suuqa xoolaha Livestock Market	1370.00	2026-07-25 14:14:07.059	81	2026-07-25 14:14:07.059	1	\N	\N	\N	APPROVED	27	FIELD_SUGUNTO_HAL	2026-09-24 08:29:55.035	USD	\N	Hal	8	2026-09-24 08:29:55.035	1	4	head	3jir	Bay
19517	CAMEL	Suuqa xoolaha Livestock Market	1370.00	2026-07-27 20:05:02.521	81	2026-07-27 20:05:02.521	1	\N	\N	\N	APPROVED	27	FIELD_BIRIMO_HAL	2026-09-24 08:29:55.035	USD	\N	Hal	8	2026-09-24 08:29:55.035	1	4	head	1jir	Bakool
19518	CAMEL	Suuqa xoolaha Livestock Market	1320.00	2026-07-30 01:55:57.983	81	2026-07-30 01:55:57.983	1	\N	\N	\N	APPROVED	27	FIELD_SUGUNTO_HAL	2026-09-24 08:29:55.035	USD	\N	Hal	8	2026-09-24 08:29:55.035	1	4	head	1jir	Bakool
19519	CAMEL	Suuqa xoolaha Livestock Market	1350.00	2026-08-01 07:46:53.445	81	2026-08-01 07:46:53.445	1	\N	\N	\N	APPROVED	27	FIELD_BIRIMO_HAL	2026-09-24 08:29:55.035	USD	\N	Hal	8	2026-09-24 08:29:55.035	1	4	head	1.5jir	Hiiraan
19520	CAMEL	Suuqa xoolaha Livestock Market	1300.00	2026-08-03 13:37:48.908	81	2026-08-03 13:37:48.908	1	\N	\N	\N	APPROVED	27	FIELD_SUGUNTO_HAL	2026-09-24 08:29:55.035	USD	\N	Hal	8	2026-09-24 08:29:55.035	1	4	head	1.5jir	Hiiraan
19521	CAMEL	Suuqa xoolaha Livestock Market	530.00	2026-08-05 19:28:44.37	81	2026-08-05 19:28:44.37	1	\N	\N	\N	APPROVED	27	FIELD_BIRIMO_QURBAC	2026-09-24 08:29:55.035	USD	\N	Qurbac	8	2026-09-24 08:29:55.035	1	59375	head	2jir	Gedo
19522	CAMEL	Suuqa xoolaha Livestock Market	480.00	2026-08-08 01:19:39.832	81	2026-08-08 01:19:39.832	1	\N	\N	\N	APPROVED	27	FIELD_SUGUNTO_QURBAC	2026-09-24 08:29:55.035	USD	\N	Qurbac	8	2026-09-24 08:29:55.035	1	59375	head	2jir	Gedo
19523	CAMEL	Suuqa xoolaha Livestock Market	520.00	2026-08-10 07:10:35.294	81	2026-08-10 07:10:35.294	1	\N	\N	\N	APPROVED	27	FIELD_BIRIMO_QURBAC	2026-09-24 08:29:55.035	USD	\N	Qurbac	8	2026-09-24 08:29:55.035	1	59375	head	3jir	Bay
19524	CAMEL	Suuqa xoolaha Livestock Market	470.00	2026-08-12 13:01:30.756	81	2026-08-12 13:01:30.756	1	\N	\N	\N	APPROVED	27	FIELD_SUGUNTO_QURBAC	2026-09-24 08:29:55.035	USD	\N	Qurbac	8	2026-09-24 08:29:55.035	1	59375	head	3jir	Bay
19525	CAMEL	Suuqa xoolaha Livestock Market	470.00	2026-08-14 18:52:26.218	81	2026-08-14 18:52:26.218	1	\N	\N	\N	APPROVED	27	FIELD_BIRIMO_QURBAC	2026-09-24 08:29:55.035	USD	\N	Qurbac	8	2026-09-24 08:29:55.035	1	59375	head	1jir	Bakool
19526	CAMEL	Suuqa xoolaha Livestock Market	420.00	2026-08-17 00:43:21.681	81	2026-08-17 00:43:21.681	1	\N	\N	\N	APPROVED	27	FIELD_SUGUNTO_QURBAC	2026-09-24 08:29:55.035	USD	\N	Qurbac	8	2026-09-24 08:29:55.035	1	59375	head	1jir	Bakool
19527	CAMEL	Suuqa xoolaha Livestock Market	450.00	2026-08-19 06:34:17.143	81	2026-08-19 06:34:17.143	1	\N	\N	\N	APPROVED	27	FIELD_BIRIMO_QURBAC	2026-09-24 08:29:55.035	USD	\N	Qurbac	8	2026-09-24 08:29:55.035	1	59375	head	1.5jir	Hiiraan
19528	CAMEL	Suuqa xoolaha Livestock Market	400.00	2026-08-21 12:25:12.605	81	2026-08-21 12:25:12.605	1	\N	\N	\N	APPROVED	27	FIELD_SUGUNTO_QURBAC	2026-09-24 08:29:55.035	USD	\N	Qurbac	8	2026-09-24 08:29:55.035	1	59375	head	1.5jir	Hiiraan
19529	CAMEL	Suuqa xoolaha Livestock Market	680.00	2026-08-23 18:16:08.067	81	2026-08-23 18:16:08.067	1	\N	\N	\N	APPROVED	27	FIELD_BIRIMO_QALIN	2026-09-24 08:29:55.035	USD	\N	Qalin	8	2026-09-24 08:29:55.035	1	2	head	2jir	Gedo
19530	CAMEL	Suuqa xoolaha Livestock Market	630.00	2026-08-26 00:07:03.529	81	2026-08-26 00:07:03.529	1	\N	\N	\N	APPROVED	27	FIELD_SUGUNTO_QALIN	2026-09-24 08:29:55.035	USD	\N	Qalin	8	2026-09-24 08:29:55.035	1	2	head	2jir	Gedo
19531	CAMEL	Suuqa xoolaha Livestock Market	670.00	2026-08-28 05:57:58.992	81	2026-08-28 05:57:58.992	1	\N	\N	\N	APPROVED	27	FIELD_BIRIMO_QALIN	2026-09-24 08:29:55.035	USD	\N	Qalin	8	2026-09-24 08:29:55.035	1	2	head	3jir	Bay
19532	CAMEL	Suuqa xoolaha Livestock Market	620.00	2026-08-30 11:48:54.454	81	2026-08-30 11:48:54.454	1	\N	\N	\N	APPROVED	27	FIELD_SUGUNTO_QALIN	2026-09-24 08:29:55.035	USD	\N	Qalin	8	2026-09-24 08:29:55.035	1	2	head	3jir	Bay
19533	CAMEL	Suuqa xoolaha Livestock Market	620.00	2026-09-01 17:39:49.916	81	2026-09-01 17:39:49.916	1	\N	\N	\N	APPROVED	27	FIELD_BIRIMO_QALIN	2026-09-24 08:29:55.035	USD	\N	Qalin	8	2026-09-24 08:29:55.035	1	2	head	1jir	Bakool
19534	CAMEL	Suuqa xoolaha Livestock Market	570.00	2026-09-03 23:30:45.378	81	2026-09-03 23:30:45.378	1	\N	\N	\N	APPROVED	27	FIELD_SUGUNTO_QALIN	2026-09-24 08:29:55.035	USD	\N	Qalin	8	2026-09-24 08:29:55.035	1	2	head	1jir	Bakool
19535	CAMEL	Suuqa xoolaha Livestock Market	600.00	2026-09-06 05:21:40.84	81	2026-09-06 05:21:40.84	1	\N	\N	\N	APPROVED	27	FIELD_BIRIMO_QALIN	2026-09-24 08:29:55.035	USD	\N	Qalin	8	2026-09-24 08:29:55.035	1	2	head	1.5jir	Hiiraan
19536	CAMEL	Suuqa xoolaha Livestock Market	550.00	2026-09-08 11:12:36.303	81	2026-09-08 11:12:36.303	1	\N	\N	\N	APPROVED	27	FIELD_SUGUNTO_QALIN	2026-09-24 08:29:55.035	USD	\N	Qalin	8	2026-09-24 08:29:55.035	1	2	head	1.5jir	Hiiraan
19537	CAMEL	Suuqa xoolaha Livestock Market	2255.00	2026-09-10 17:03:31.765	81	2026-09-10 17:03:31.765	1	\N	\N	\N	APPROVED	27	FIELD_BIRIMO_BAARQAB	2026-09-24 08:29:55.035	USD	\N	Baarqab	8	2026-09-24 08:29:55.035	1	1	head	2jir	Gedo
19538	CAMEL	Suuqa xoolaha Livestock Market	2205.00	2026-09-12 22:54:27.227	81	2026-09-12 22:54:27.227	1	\N	\N	\N	APPROVED	27	FIELD_SUGUNTO_BAARQAB	2026-09-24 08:29:55.035	USD	\N	Baarqab	8	2026-09-24 08:29:55.035	1	1	head	2jir	Gedo
19539	CAMEL	Suuqa xoolaha Livestock Market	2245.00	2026-09-15 04:45:22.689	81	2026-09-15 04:45:22.689	1	\N	\N	\N	APPROVED	27	FIELD_BIRIMO_BAARQAB	2026-09-24 08:29:55.035	USD	\N	Baarqab	8	2026-09-24 08:29:55.035	1	1	head	3jir	Bay
19540	CAMEL	Suuqa xoolaha Livestock Market	2195.00	2026-09-17 10:36:18.151	81	2026-09-17 10:36:18.151	1	\N	\N	\N	APPROVED	27	FIELD_SUGUNTO_BAARQAB	2026-09-24 08:29:55.035	USD	\N	Baarqab	8	2026-09-24 08:29:55.035	1	1	head	3jir	Bay
19541	CAMEL	Suuqa xoolaha Livestock Market	2195.00	2026-09-19 16:27:13.613	81	2026-09-19 16:27:13.613	1	\N	\N	\N	APPROVED	27	FIELD_BIRIMO_BAARQAB	2026-09-24 08:29:55.035	USD	\N	Baarqab	8	2026-09-24 08:29:55.035	1	1	head	1jir	Bakool
19542	CAMEL	Suuqa xoolaha Livestock Market	2145.00	2026-09-21 22:18:09.076	81	2026-09-21 22:18:09.076	1	\N	\N	\N	APPROVED	27	FIELD_SUGUNTO_BAARQAB	2026-09-24 08:29:55.035	USD	\N	Baarqab	8	2026-09-24 08:29:55.035	1	1	head	1jir	Bakool
19543	CAMEL	Suuqa xoolaha Livestock Market	2175.00	2026-09-24 04:09:04.538	81	2026-09-24 04:09:04.538	1	\N	\N	\N	APPROVED	27	FIELD_BIRIMO_BAARQAB	2026-09-24 08:29:55.035	USD	\N	Baarqab	8	2026-09-24 08:29:55.035	1	1	head	1.5jir	Hiiraan
19544	CAMEL	Suuqa xoolaha Livestock Market	2125.00	2026-09-26 10:00:00	81	2026-09-26 10:00:00	1	\N	\N	\N	APPROVED	27	FIELD_SUGUNTO_BAARQAB	2026-09-24 08:29:55.035	USD	\N	Baarqab	8	2026-09-24 08:29:55.035	1	1	head	1.5jir	Hiiraan
19545	CATTLE	Sinka dheer Livestock Market	405.00	2026-01-02 10:00:00	77	2026-01-02 10:00:00	1	\N	\N	\N	APPROVED	23	FIELD_BIRIMO_SAC	2026-09-24 08:29:59.435	USD	\N	Sac	7	2026-09-24 08:29:59.435	2	36852	head	1jir	Gedo
19546	CATTLE	Sinka dheer Livestock Market	355.00	2026-01-04 12:27:24.094	77	2026-01-04 12:27:24.094	1	\N	\N	\N	APPROVED	23	FIELD_SUGUNTO_SAC	2026-09-24 08:29:59.435	USD	\N	Sac	7	2026-09-24 08:29:59.435	2	36852	head	1jir	Gedo
19547	CATTLE	Sinka dheer Livestock Market	400.00	2026-01-06 14:54:48.189	77	2026-01-06 14:54:48.189	1	\N	\N	\N	APPROVED	23	FIELD_BIRIMO_SAC	2026-09-24 08:29:59.435	USD	\N	Sac	7	2026-09-24 08:29:59.435	2	36852	head	1.5jir	Bay
19548	CATTLE	Sinka dheer Livestock Market	350.00	2026-01-08 17:22:12.283	77	2026-01-08 17:22:12.283	1	\N	\N	\N	APPROVED	23	FIELD_SUGUNTO_SAC	2026-09-24 08:29:59.435	USD	\N	Sac	7	2026-09-24 08:29:59.435	2	36852	head	1.5jir	Bay
19549	CATTLE	Sinka dheer Livestock Market	420.00	2026-01-10 19:49:36.378	77	2026-01-10 19:49:36.378	1	\N	\N	\N	APPROVED	23	FIELD_BIRIMO_SAC	2026-09-24 08:29:59.435	USD	\N	Sac	7	2026-09-24 08:29:59.435	2	36852	head	2jir	Bakool
19550	CATTLE	Sinka dheer Livestock Market	370.00	2026-01-12 22:17:00.472	77	2026-01-12 22:17:00.472	1	\N	\N	\N	APPROVED	23	FIELD_SUGUNTO_SAC	2026-09-24 08:29:59.435	USD	\N	Sac	7	2026-09-24 08:29:59.435	2	36852	head	2jir	Bakool
19551	CATTLE	Sinka dheer Livestock Market	410.00	2026-01-15 00:44:24.567	77	2026-01-15 00:44:24.567	1	\N	\N	\N	APPROVED	23	FIELD_BIRIMO_SAC	2026-09-24 08:29:59.435	USD	\N	Sac	7	2026-09-24 08:29:59.435	2	36852	head	3jir	Hiiraan
19552	CATTLE	Sinka dheer Livestock Market	360.00	2026-01-17 03:11:48.661	77	2026-01-17 03:11:48.661	1	\N	\N	\N	APPROVED	23	FIELD_SUGUNTO_SAC	2026-09-24 08:29:59.435	USD	\N	Sac	7	2026-09-24 08:29:59.435	2	36852	head	3jir	Hiiraan
19553	CATTLE	Sinka dheer Livestock Market	505.00	2026-01-19 05:39:12.756	77	2026-01-19 05:39:12.756	1	\N	\N	\N	APPROVED	23	FIELD_BIRIMO_DIBI	2026-09-24 08:29:59.435	USD	\N	Dibi	7	2026-09-24 08:29:59.435	2	8	head	1jir	Gedo
19554	CATTLE	Sinka dheer Livestock Market	455.00	2026-01-21 08:06:36.85	77	2026-01-21 08:06:36.85	1	\N	\N	\N	APPROVED	23	FIELD_SUGUNTO_DIBI	2026-09-24 08:29:59.435	USD	\N	Dibi	7	2026-09-24 08:29:59.435	2	8	head	1jir	Gedo
19555	CATTLE	Sinka dheer Livestock Market	500.00	2026-01-23 10:34:00.945	77	2026-01-23 10:34:00.945	1	\N	\N	\N	APPROVED	23	FIELD_BIRIMO_DIBI	2026-09-24 08:29:59.435	USD	\N	Dibi	7	2026-09-24 08:29:59.435	2	8	head	1.5jir	Bay
19556	CATTLE	Sinka dheer Livestock Market	450.00	2026-01-25 13:01:25.039	77	2026-01-25 13:01:25.039	1	\N	\N	\N	APPROVED	23	FIELD_SUGUNTO_DIBI	2026-09-24 08:29:59.435	USD	\N	Dibi	7	2026-09-24 08:29:59.435	2	8	head	1.5jir	Bay
19557	CATTLE	Sinka dheer Livestock Market	520.00	2026-01-27 15:28:49.134	77	2026-01-27 15:28:49.134	1	\N	\N	\N	APPROVED	23	FIELD_BIRIMO_DIBI	2026-09-24 08:29:59.435	USD	\N	Dibi	7	2026-09-24 08:29:59.435	2	8	head	2jir	Bakool
19558	CATTLE	Sinka dheer Livestock Market	470.00	2026-01-29 17:56:13.228	77	2026-01-29 17:56:13.228	1	\N	\N	\N	APPROVED	23	FIELD_SUGUNTO_DIBI	2026-09-24 08:29:59.435	USD	\N	Dibi	7	2026-09-24 08:29:59.435	2	8	head	2jir	Bakool
19559	CATTLE	Sinka dheer Livestock Market	510.00	2026-01-31 20:23:37.323	77	2026-01-31 20:23:37.323	1	\N	\N	\N	APPROVED	23	FIELD_BIRIMO_DIBI	2026-09-24 08:29:59.435	USD	\N	Dibi	7	2026-09-24 08:29:59.435	2	8	head	3jir	Hiiraan
19560	CATTLE	Sinka dheer Livestock Market	460.00	2026-02-02 22:51:01.417	77	2026-02-02 22:51:01.417	1	\N	\N	\N	APPROVED	23	FIELD_SUGUNTO_DIBI	2026-09-24 08:29:59.435	USD	\N	Dibi	7	2026-09-24 08:29:59.435	2	8	head	3jir	Hiiraan
19561	CATTLE	Sinka dheer Livestock Market	255.00	2026-02-05 01:18:25.512	77	2026-02-05 01:18:25.512	1	\N	\N	\N	APPROVED	23	FIELD_BIRIMO_WEYL	2026-09-24 08:29:59.435	USD	\N	Weyl	7	2026-09-24 08:29:59.435	2	7	head	1jir	Gedo
19562	CATTLE	Sinka dheer Livestock Market	205.00	2026-02-07 03:45:49.606	77	2026-02-07 03:45:49.606	1	\N	\N	\N	APPROVED	23	FIELD_SUGUNTO_WEYL	2026-09-24 08:29:59.435	USD	\N	Weyl	7	2026-09-24 08:29:59.435	2	7	head	1jir	Gedo
19563	CATTLE	Sinka dheer Livestock Market	250.00	2026-02-09 06:13:13.701	77	2026-02-09 06:13:13.701	1	\N	\N	\N	APPROVED	23	FIELD_BIRIMO_WEYL	2026-09-24 08:29:59.435	USD	\N	Weyl	7	2026-09-24 08:29:59.435	2	7	head	1.5jir	Bay
19564	CATTLE	Sinka dheer Livestock Market	200.00	2026-02-11 08:40:37.795	77	2026-02-11 08:40:37.795	1	\N	\N	\N	APPROVED	23	FIELD_SUGUNTO_WEYL	2026-09-24 08:29:59.435	USD	\N	Weyl	7	2026-09-24 08:29:59.435	2	7	head	1.5jir	Bay
19565	CATTLE	Sinka dheer Livestock Market	270.00	2026-02-13 11:08:01.89	77	2026-02-13 11:08:01.89	1	\N	\N	\N	APPROVED	23	FIELD_BIRIMO_WEYL	2026-09-24 08:29:59.435	USD	\N	Weyl	7	2026-09-24 08:29:59.435	2	7	head	2jir	Bakool
19566	CATTLE	Sinka dheer Livestock Market	220.00	2026-02-15 13:35:25.984	77	2026-02-15 13:35:25.984	1	\N	\N	\N	APPROVED	23	FIELD_SUGUNTO_WEYL	2026-09-24 08:29:59.435	USD	\N	Weyl	7	2026-09-24 08:29:59.435	2	7	head	2jir	Bakool
19567	CATTLE	Sinka dheer Livestock Market	260.00	2026-02-17 16:02:50.079	77	2026-02-17 16:02:50.079	1	\N	\N	\N	APPROVED	23	FIELD_BIRIMO_WEYL	2026-09-24 08:29:59.435	USD	\N	Weyl	7	2026-09-24 08:29:59.435	2	7	head	3jir	Hiiraan
19568	CATTLE	Sinka dheer Livestock Market	210.00	2026-02-19 18:30:14.173	77	2026-02-19 18:30:14.173	1	\N	\N	\N	APPROVED	23	FIELD_SUGUNTO_WEYL	2026-09-24 08:29:59.435	USD	\N	Weyl	7	2026-09-24 08:29:59.435	2	7	head	3jir	Hiiraan
19569	CATTLE	Sinka dheer Livestock Market	205.00	2026-02-21 20:57:38.268	77	2026-02-21 20:57:38.268	1	\N	\N	\N	APPROVED	23	FIELD_BIRIMO_QAALIN	2026-09-24 08:29:59.435	USD	\N	Qaalin	7	2026-09-24 08:29:59.435	2	6	head	1jir	Gedo
19570	CATTLE	Sinka dheer Livestock Market	155.00	2026-02-23 23:25:02.362	77	2026-02-23 23:25:02.362	1	\N	\N	\N	APPROVED	23	FIELD_SUGUNTO_QAALIN	2026-09-24 08:29:59.435	USD	\N	Qaalin	7	2026-09-24 08:29:59.435	2	6	head	1jir	Gedo
19571	CATTLE	Sinka dheer Livestock Market	200.00	2026-02-26 01:52:26.457	77	2026-02-26 01:52:26.457	1	\N	\N	\N	APPROVED	23	FIELD_BIRIMO_QAALIN	2026-09-24 08:29:59.435	USD	\N	Qaalin	7	2026-09-24 08:29:59.435	2	6	head	1.5jir	Bay
19572	CATTLE	Sinka dheer Livestock Market	150.00	2026-02-28 04:19:50.551	77	2026-02-28 04:19:50.551	1	\N	\N	\N	APPROVED	23	FIELD_SUGUNTO_QAALIN	2026-09-24 08:29:59.435	USD	\N	Qaalin	7	2026-09-24 08:29:59.435	2	6	head	1.5jir	Bay
19573	CATTLE	Sinka dheer Livestock Market	220.00	2026-03-02 06:47:14.646	77	2026-03-02 06:47:14.646	1	\N	\N	\N	APPROVED	23	FIELD_BIRIMO_QAALIN	2026-09-24 08:29:59.435	USD	\N	Qaalin	7	2026-09-24 08:29:59.435	2	6	head	2jir	Bakool
19574	CATTLE	Sinka dheer Livestock Market	170.00	2026-03-04 09:14:38.74	77	2026-03-04 09:14:38.74	1	\N	\N	\N	APPROVED	23	FIELD_SUGUNTO_QAALIN	2026-09-24 08:29:59.435	USD	\N	Qaalin	7	2026-09-24 08:29:59.435	2	6	head	2jir	Bakool
19575	CATTLE	Sinka dheer Livestock Market	210.00	2026-03-06 11:42:02.835	77	2026-03-06 11:42:02.835	1	\N	\N	\N	APPROVED	23	FIELD_BIRIMO_QAALIN	2026-09-24 08:29:59.435	USD	\N	Qaalin	7	2026-09-24 08:29:59.435	2	6	head	3jir	Hiiraan
19576	CATTLE	Sinka dheer Livestock Market	160.00	2026-03-08 14:09:26.929	77	2026-03-08 14:09:26.929	1	\N	\N	\N	APPROVED	23	FIELD_SUGUNTO_QAALIN	2026-09-24 08:29:59.435	USD	\N	Qaalin	7	2026-09-24 08:29:59.435	2	6	head	3jir	Hiiraan
19577	CATTLE	Suuqa xoolaha Livestock Market	435.00	2026-03-10 16:36:51.024	79	2026-03-10 16:36:51.024	1	\N	\N	\N	APPROVED	25	FIELD_BIRIMO_SAC	2026-09-24 08:29:59.435	USD	\N	Sac	8	2026-09-24 08:29:59.435	2	36852	head	1.5jir	Gedo
19578	CATTLE	Suuqa xoolaha Livestock Market	385.00	2026-03-12 19:04:15.118	79	2026-03-12 19:04:15.118	1	\N	\N	\N	APPROVED	25	FIELD_SUGUNTO_SAC	2026-09-24 08:29:59.435	USD	\N	Sac	8	2026-09-24 08:29:59.435	2	36852	head	1.5jir	Gedo
19579	CATTLE	Suuqa xoolaha Livestock Market	425.00	2026-03-14 21:31:39.213	79	2026-03-14 21:31:39.213	1	\N	\N	\N	APPROVED	25	FIELD_BIRIMO_SAC	2026-09-24 08:29:59.435	USD	\N	Sac	8	2026-09-24 08:29:59.435	2	36852	head	2jir	Bay
19580	CATTLE	Suuqa xoolaha Livestock Market	375.00	2026-03-16 23:59:03.307	79	2026-03-16 23:59:03.307	1	\N	\N	\N	APPROVED	25	FIELD_SUGUNTO_SAC	2026-09-24 08:29:59.435	USD	\N	Sac	8	2026-09-24 08:29:59.435	2	36852	head	2jir	Bay
19581	CATTLE	Suuqa xoolaha Livestock Market	445.00	2026-03-19 02:26:27.402	79	2026-03-19 02:26:27.402	1	\N	\N	\N	APPROVED	25	FIELD_BIRIMO_SAC	2026-09-24 08:29:59.435	USD	\N	Sac	8	2026-09-24 08:29:59.435	2	36852	head	3jir	Bakool
19582	CATTLE	Suuqa xoolaha Livestock Market	395.00	2026-03-21 04:53:51.496	79	2026-03-21 04:53:51.496	1	\N	\N	\N	APPROVED	25	FIELD_SUGUNTO_SAC	2026-09-24 08:29:59.435	USD	\N	Sac	8	2026-09-24 08:29:59.435	2	36852	head	3jir	Bakool
19583	CATTLE	Suuqa xoolaha Livestock Market	390.00	2026-03-23 07:21:15.591	79	2026-03-23 07:21:15.591	1	\N	\N	\N	APPROVED	25	FIELD_BIRIMO_SAC	2026-09-24 08:29:59.435	USD	\N	Sac	8	2026-09-24 08:29:59.435	2	36852	head	1jir	Hiiraan
19584	CATTLE	Suuqa xoolaha Livestock Market	340.00	2026-03-25 09:48:39.685	79	2026-03-25 09:48:39.685	1	\N	\N	\N	APPROVED	25	FIELD_SUGUNTO_SAC	2026-09-24 08:29:59.435	USD	\N	Sac	8	2026-09-24 08:29:59.435	2	36852	head	1jir	Hiiraan
19585	CATTLE	Suuqa xoolaha Livestock Market	535.00	2026-03-27 12:16:03.78	79	2026-03-27 12:16:03.78	1	\N	\N	\N	APPROVED	25	FIELD_BIRIMO_DIBI	2026-09-24 08:29:59.435	USD	\N	Dibi	8	2026-09-24 08:29:59.435	2	8	head	1.5jir	Gedo
19586	CATTLE	Suuqa xoolaha Livestock Market	485.00	2026-03-29 14:43:27.874	79	2026-03-29 14:43:27.874	1	\N	\N	\N	APPROVED	25	FIELD_SUGUNTO_DIBI	2026-09-24 08:29:59.435	USD	\N	Dibi	8	2026-09-24 08:29:59.435	2	8	head	1.5jir	Gedo
19587	CATTLE	Suuqa xoolaha Livestock Market	525.00	2026-03-31 17:10:51.969	79	2026-03-31 17:10:51.969	1	\N	\N	\N	APPROVED	25	FIELD_BIRIMO_DIBI	2026-09-24 08:29:59.435	USD	\N	Dibi	8	2026-09-24 08:29:59.435	2	8	head	2jir	Bay
19588	CATTLE	Suuqa xoolaha Livestock Market	475.00	2026-04-02 19:38:16.063	79	2026-04-02 19:38:16.063	1	\N	\N	\N	APPROVED	25	FIELD_SUGUNTO_DIBI	2026-09-24 08:29:59.435	USD	\N	Dibi	8	2026-09-24 08:29:59.435	2	8	head	2jir	Bay
19589	CATTLE	Suuqa xoolaha Livestock Market	545.00	2026-04-04 22:05:40.157	79	2026-04-04 22:05:40.157	1	\N	\N	\N	APPROVED	25	FIELD_BIRIMO_DIBI	2026-09-24 08:29:59.435	USD	\N	Dibi	8	2026-09-24 08:29:59.435	2	8	head	3jir	Bakool
19590	CATTLE	Suuqa xoolaha Livestock Market	495.00	2026-04-07 00:33:04.252	79	2026-04-07 00:33:04.252	1	\N	\N	\N	APPROVED	25	FIELD_SUGUNTO_DIBI	2026-09-24 08:29:59.435	USD	\N	Dibi	8	2026-09-24 08:29:59.435	2	8	head	3jir	Bakool
19591	CATTLE	Suuqa xoolaha Livestock Market	490.00	2026-04-09 03:00:28.346	79	2026-04-09 03:00:28.346	1	\N	\N	\N	APPROVED	25	FIELD_BIRIMO_DIBI	2026-09-24 08:29:59.435	USD	\N	Dibi	8	2026-09-24 08:29:59.435	2	8	head	1jir	Hiiraan
19592	CATTLE	Suuqa xoolaha Livestock Market	440.00	2026-04-11 05:27:52.441	79	2026-04-11 05:27:52.441	1	\N	\N	\N	APPROVED	25	FIELD_SUGUNTO_DIBI	2026-09-24 08:29:59.435	USD	\N	Dibi	8	2026-09-24 08:29:59.435	2	8	head	1jir	Hiiraan
19593	CATTLE	Suuqa xoolaha Livestock Market	285.00	2026-04-13 07:55:16.535	79	2026-04-13 07:55:16.535	1	\N	\N	\N	APPROVED	25	FIELD_BIRIMO_WEYL	2026-09-24 08:29:59.435	USD	\N	Weyl	8	2026-09-24 08:29:59.435	2	7	head	1.5jir	Gedo
19594	CATTLE	Suuqa xoolaha Livestock Market	235.00	2026-04-15 10:22:40.63	79	2026-04-15 10:22:40.63	1	\N	\N	\N	APPROVED	25	FIELD_SUGUNTO_WEYL	2026-09-24 08:29:59.435	USD	\N	Weyl	8	2026-09-24 08:29:59.435	2	7	head	1.5jir	Gedo
19595	CATTLE	Suuqa xoolaha Livestock Market	275.00	2026-04-17 12:50:04.724	79	2026-04-17 12:50:04.724	1	\N	\N	\N	APPROVED	25	FIELD_BIRIMO_WEYL	2026-09-24 08:29:59.435	USD	\N	Weyl	8	2026-09-24 08:29:59.435	2	7	head	2jir	Bay
19596	CATTLE	Suuqa xoolaha Livestock Market	225.00	2026-04-19 15:17:28.819	79	2026-04-19 15:17:28.819	1	\N	\N	\N	APPROVED	25	FIELD_SUGUNTO_WEYL	2026-09-24 08:29:59.435	USD	\N	Weyl	8	2026-09-24 08:29:59.435	2	7	head	2jir	Bay
19597	CATTLE	Suuqa xoolaha Livestock Market	295.00	2026-04-21 17:44:52.913	79	2026-04-21 17:44:52.913	1	\N	\N	\N	APPROVED	25	FIELD_BIRIMO_WEYL	2026-09-24 08:29:59.435	USD	\N	Weyl	8	2026-09-24 08:29:59.435	2	7	head	3jir	Bakool
19598	CATTLE	Suuqa xoolaha Livestock Market	245.00	2026-04-23 20:12:17.008	79	2026-04-23 20:12:17.008	1	\N	\N	\N	APPROVED	25	FIELD_SUGUNTO_WEYL	2026-09-24 08:29:59.435	USD	\N	Weyl	8	2026-09-24 08:29:59.435	2	7	head	3jir	Bakool
19599	CATTLE	Suuqa xoolaha Livestock Market	240.00	2026-04-25 22:39:41.102	79	2026-04-25 22:39:41.102	1	\N	\N	\N	APPROVED	25	FIELD_BIRIMO_WEYL	2026-09-24 08:29:59.435	USD	\N	Weyl	8	2026-09-24 08:29:59.435	2	7	head	1jir	Hiiraan
19600	CATTLE	Suuqa xoolaha Livestock Market	190.00	2026-04-28 01:07:05.197	79	2026-04-28 01:07:05.197	1	\N	\N	\N	APPROVED	25	FIELD_SUGUNTO_WEYL	2026-09-24 08:29:59.435	USD	\N	Weyl	8	2026-09-24 08:29:59.435	2	7	head	1jir	Hiiraan
19601	CATTLE	Suuqa xoolaha Livestock Market	235.00	2026-04-30 03:34:29.291	79	2026-04-30 03:34:29.291	1	\N	\N	\N	APPROVED	25	FIELD_BIRIMO_QAALIN	2026-09-24 08:29:59.435	USD	\N	Qaalin	8	2026-09-24 08:29:59.435	2	6	head	1.5jir	Gedo
19602	CATTLE	Suuqa xoolaha Livestock Market	185.00	2026-05-02 06:01:53.386	79	2026-05-02 06:01:53.386	1	\N	\N	\N	APPROVED	25	FIELD_SUGUNTO_QAALIN	2026-09-24 08:29:59.435	USD	\N	Qaalin	8	2026-09-24 08:29:59.435	2	6	head	1.5jir	Gedo
19603	CATTLE	Suuqa xoolaha Livestock Market	225.00	2026-05-04 08:29:17.48	79	2026-05-04 08:29:17.48	1	\N	\N	\N	APPROVED	25	FIELD_BIRIMO_QAALIN	2026-09-24 08:29:59.435	USD	\N	Qaalin	8	2026-09-24 08:29:59.435	2	6	head	2jir	Bay
19604	CATTLE	Suuqa xoolaha Livestock Market	175.00	2026-05-06 10:56:41.575	79	2026-05-06 10:56:41.575	1	\N	\N	\N	APPROVED	25	FIELD_SUGUNTO_QAALIN	2026-09-24 08:29:59.435	USD	\N	Qaalin	8	2026-09-24 08:29:59.435	2	6	head	2jir	Bay
19605	CATTLE	Suuqa xoolaha Livestock Market	245.00	2026-05-08 13:24:05.669	79	2026-05-08 13:24:05.669	1	\N	\N	\N	APPROVED	25	FIELD_BIRIMO_QAALIN	2026-09-24 08:29:59.435	USD	\N	Qaalin	8	2026-09-24 08:29:59.435	2	6	head	3jir	Bakool
19606	CATTLE	Suuqa xoolaha Livestock Market	195.00	2026-05-10 15:51:29.764	79	2026-05-10 15:51:29.764	1	\N	\N	\N	APPROVED	25	FIELD_SUGUNTO_QAALIN	2026-09-24 08:29:59.435	USD	\N	Qaalin	8	2026-09-24 08:29:59.435	2	6	head	3jir	Bakool
19607	CATTLE	Suuqa xoolaha Livestock Market	190.00	2026-05-12 18:18:53.858	79	2026-05-12 18:18:53.858	1	\N	\N	\N	APPROVED	25	FIELD_BIRIMO_QAALIN	2026-09-24 08:29:59.435	USD	\N	Qaalin	8	2026-09-24 08:29:59.435	2	6	head	1jir	Hiiraan
19608	CATTLE	Suuqa xoolaha Livestock Market	140.00	2026-05-14 20:46:17.953	79	2026-05-14 20:46:17.953	1	\N	\N	\N	APPROVED	25	FIELD_SUGUNTO_QAALIN	2026-09-24 08:29:59.435	USD	\N	Qaalin	8	2026-09-24 08:29:59.435	2	6	head	1jir	Hiiraan
19609	CATTLE	Dayax Livestock Market	420.00	2026-05-16 23:13:42.047	80	2026-05-16 23:13:42.047	1	\N	\N	\N	APPROVED	26	FIELD_BIRIMO_SAC	2026-09-24 08:29:59.435	USD	\N	Sac	9	2026-09-24 08:29:59.435	2	36852	head	2jir	Gedo
19610	CATTLE	Dayax Livestock Market	370.00	2026-05-19 01:41:06.142	80	2026-05-19 01:41:06.142	1	\N	\N	\N	APPROVED	26	FIELD_SUGUNTO_SAC	2026-09-24 08:29:59.435	USD	\N	Sac	9	2026-09-24 08:29:59.435	2	36852	head	2jir	Gedo
19611	CATTLE	Dayax Livestock Market	410.00	2026-05-21 04:08:30.236	80	2026-05-21 04:08:30.236	1	\N	\N	\N	APPROVED	26	FIELD_BIRIMO_SAC	2026-09-24 08:29:59.435	USD	\N	Sac	9	2026-09-24 08:29:59.435	2	36852	head	3jir	Bay
19612	CATTLE	Dayax Livestock Market	360.00	2026-05-23 06:35:54.331	80	2026-05-23 06:35:54.331	1	\N	\N	\N	APPROVED	26	FIELD_SUGUNTO_SAC	2026-09-24 08:29:59.435	USD	\N	Sac	9	2026-09-24 08:29:59.435	2	36852	head	3jir	Bay
19613	CATTLE	Dayax Livestock Market	385.00	2026-05-25 09:03:18.425	80	2026-05-25 09:03:18.425	1	\N	\N	\N	APPROVED	26	FIELD_BIRIMO_SAC	2026-09-24 08:29:59.435	USD	\N	Sac	9	2026-09-24 08:29:59.435	2	36852	head	1jir	Bakool
19614	CATTLE	Dayax Livestock Market	335.00	2026-05-27 11:30:42.52	80	2026-05-27 11:30:42.52	1	\N	\N	\N	APPROVED	26	FIELD_SUGUNTO_SAC	2026-09-24 08:29:59.435	USD	\N	Sac	9	2026-09-24 08:29:59.435	2	36852	head	1jir	Bakool
19615	CATTLE	Dayax Livestock Market	380.00	2026-05-29 13:58:06.614	80	2026-05-29 13:58:06.614	1	\N	\N	\N	APPROVED	26	FIELD_BIRIMO_SAC	2026-09-24 08:29:59.435	USD	\N	Sac	9	2026-09-24 08:29:59.435	2	36852	head	1.5jir	Hiiraan
19616	CATTLE	Dayax Livestock Market	330.00	2026-05-31 16:25:30.709	80	2026-05-31 16:25:30.709	1	\N	\N	\N	APPROVED	26	FIELD_SUGUNTO_SAC	2026-09-24 08:29:59.435	USD	\N	Sac	9	2026-09-24 08:29:59.435	2	36852	head	1.5jir	Hiiraan
19617	CATTLE	Dayax Livestock Market	520.00	2026-06-02 18:52:54.803	80	2026-06-02 18:52:54.803	1	\N	\N	\N	APPROVED	26	FIELD_BIRIMO_DIBI	2026-09-24 08:29:59.435	USD	\N	Dibi	9	2026-09-24 08:29:59.435	2	8	head	2jir	Gedo
19618	CATTLE	Dayax Livestock Market	470.00	2026-06-04 21:20:18.898	80	2026-06-04 21:20:18.898	1	\N	\N	\N	APPROVED	26	FIELD_SUGUNTO_DIBI	2026-09-24 08:29:59.435	USD	\N	Dibi	9	2026-09-24 08:29:59.435	2	8	head	2jir	Gedo
19619	CATTLE	Dayax Livestock Market	510.00	2026-06-06 23:47:42.992	80	2026-06-06 23:47:42.992	1	\N	\N	\N	APPROVED	26	FIELD_BIRIMO_DIBI	2026-09-24 08:29:59.435	USD	\N	Dibi	9	2026-09-24 08:29:59.435	2	8	head	3jir	Bay
19620	CATTLE	Dayax Livestock Market	460.00	2026-06-09 02:15:07.087	80	2026-06-09 02:15:07.087	1	\N	\N	\N	APPROVED	26	FIELD_SUGUNTO_DIBI	2026-09-24 08:29:59.435	USD	\N	Dibi	9	2026-09-24 08:29:59.435	2	8	head	3jir	Bay
19621	CATTLE	Dayax Livestock Market	485.00	2026-06-11 04:42:31.181	80	2026-06-11 04:42:31.181	1	\N	\N	\N	APPROVED	26	FIELD_BIRIMO_DIBI	2026-09-24 08:29:59.435	USD	\N	Dibi	9	2026-09-24 08:29:59.435	2	8	head	1jir	Bakool
19622	CATTLE	Dayax Livestock Market	435.00	2026-06-13 07:09:55.276	80	2026-06-13 07:09:55.276	1	\N	\N	\N	APPROVED	26	FIELD_SUGUNTO_DIBI	2026-09-24 08:29:59.435	USD	\N	Dibi	9	2026-09-24 08:29:59.435	2	8	head	1jir	Bakool
19623	CATTLE	Dayax Livestock Market	480.00	2026-06-15 09:37:19.37	80	2026-06-15 09:37:19.37	1	\N	\N	\N	APPROVED	26	FIELD_BIRIMO_DIBI	2026-09-24 08:29:59.435	USD	\N	Dibi	9	2026-09-24 08:29:59.435	2	8	head	1.5jir	Hiiraan
19624	CATTLE	Dayax Livestock Market	430.00	2026-06-17 12:04:43.465	80	2026-06-17 12:04:43.465	1	\N	\N	\N	APPROVED	26	FIELD_SUGUNTO_DIBI	2026-09-24 08:29:59.435	USD	\N	Dibi	9	2026-09-24 08:29:59.435	2	8	head	1.5jir	Hiiraan
19625	CATTLE	Dayax Livestock Market	270.00	2026-06-19 14:32:07.559	80	2026-06-19 14:32:07.559	1	\N	\N	\N	APPROVED	26	FIELD_BIRIMO_WEYL	2026-09-24 08:29:59.435	USD	\N	Weyl	9	2026-09-24 08:29:59.435	2	7	head	2jir	Gedo
19626	CATTLE	Dayax Livestock Market	220.00	2026-06-21 16:59:31.654	80	2026-06-21 16:59:31.654	1	\N	\N	\N	APPROVED	26	FIELD_SUGUNTO_WEYL	2026-09-24 08:29:59.435	USD	\N	Weyl	9	2026-09-24 08:29:59.435	2	7	head	2jir	Gedo
19627	CATTLE	Dayax Livestock Market	260.00	2026-06-23 19:26:55.748	80	2026-06-23 19:26:55.748	1	\N	\N	\N	APPROVED	26	FIELD_BIRIMO_WEYL	2026-09-24 08:29:59.435	USD	\N	Weyl	9	2026-09-24 08:29:59.435	2	7	head	3jir	Bay
19628	CATTLE	Dayax Livestock Market	210.00	2026-06-25 21:54:19.843	80	2026-06-25 21:54:19.843	1	\N	\N	\N	APPROVED	26	FIELD_SUGUNTO_WEYL	2026-09-24 08:29:59.435	USD	\N	Weyl	9	2026-09-24 08:29:59.435	2	7	head	3jir	Bay
19629	CATTLE	Dayax Livestock Market	235.00	2026-06-28 00:21:43.937	80	2026-06-28 00:21:43.937	1	\N	\N	\N	APPROVED	26	FIELD_BIRIMO_WEYL	2026-09-24 08:29:59.435	USD	\N	Weyl	9	2026-09-24 08:29:59.435	2	7	head	1jir	Bakool
19630	CATTLE	Dayax Livestock Market	185.00	2026-06-30 02:49:08.031	80	2026-06-30 02:49:08.031	1	\N	\N	\N	APPROVED	26	FIELD_SUGUNTO_WEYL	2026-09-24 08:29:59.435	USD	\N	Weyl	9	2026-09-24 08:29:59.435	2	7	head	1jir	Bakool
19631	CATTLE	Dayax Livestock Market	230.00	2026-07-02 05:16:32.126	80	2026-07-02 05:16:32.126	1	\N	\N	\N	APPROVED	26	FIELD_BIRIMO_WEYL	2026-09-24 08:29:59.435	USD	\N	Weyl	9	2026-09-24 08:29:59.435	2	7	head	1.5jir	Hiiraan
19632	CATTLE	Dayax Livestock Market	180.00	2026-07-04 07:43:56.22	80	2026-07-04 07:43:56.22	1	\N	\N	\N	APPROVED	26	FIELD_SUGUNTO_WEYL	2026-09-24 08:29:59.435	USD	\N	Weyl	9	2026-09-24 08:29:59.435	2	7	head	1.5jir	Hiiraan
19633	CATTLE	Dayax Livestock Market	220.00	2026-07-06 10:11:20.315	80	2026-07-06 10:11:20.315	1	\N	\N	\N	APPROVED	26	FIELD_BIRIMO_QAALIN	2026-09-24 08:29:59.435	USD	\N	Qaalin	9	2026-09-24 08:29:59.435	2	6	head	2jir	Gedo
19634	CATTLE	Dayax Livestock Market	170.00	2026-07-08 12:38:44.409	80	2026-07-08 12:38:44.409	1	\N	\N	\N	APPROVED	26	FIELD_SUGUNTO_QAALIN	2026-09-24 08:29:59.435	USD	\N	Qaalin	9	2026-09-24 08:29:59.435	2	6	head	2jir	Gedo
19635	CATTLE	Dayax Livestock Market	210.00	2026-07-10 15:06:08.504	80	2026-07-10 15:06:08.504	1	\N	\N	\N	APPROVED	26	FIELD_BIRIMO_QAALIN	2026-09-24 08:29:59.435	USD	\N	Qaalin	9	2026-09-24 08:29:59.435	2	6	head	3jir	Bay
19636	CATTLE	Dayax Livestock Market	160.00	2026-07-12 17:33:32.598	80	2026-07-12 17:33:32.598	1	\N	\N	\N	APPROVED	26	FIELD_SUGUNTO_QAALIN	2026-09-24 08:29:59.435	USD	\N	Qaalin	9	2026-09-24 08:29:59.435	2	6	head	3jir	Bay
19637	CATTLE	Dayax Livestock Market	185.00	2026-07-14 20:00:56.693	80	2026-07-14 20:00:56.693	1	\N	\N	\N	APPROVED	26	FIELD_BIRIMO_QAALIN	2026-09-24 08:29:59.435	USD	\N	Qaalin	9	2026-09-24 08:29:59.435	2	6	head	1jir	Bakool
19638	CATTLE	Dayax Livestock Market	135.00	2026-07-16 22:28:20.787	80	2026-07-16 22:28:20.787	1	\N	\N	\N	APPROVED	26	FIELD_SUGUNTO_QAALIN	2026-09-24 08:29:59.435	USD	\N	Qaalin	9	2026-09-24 08:29:59.435	2	6	head	1jir	Bakool
19639	CATTLE	Dayax Livestock Market	180.00	2026-07-19 00:55:44.882	80	2026-07-19 00:55:44.882	1	\N	\N	\N	APPROVED	26	FIELD_BIRIMO_QAALIN	2026-09-24 08:29:59.435	USD	\N	Qaalin	9	2026-09-24 08:29:59.435	2	6	head	1.5jir	Hiiraan
19640	CATTLE	Dayax Livestock Market	130.00	2026-07-21 03:23:08.976	80	2026-07-21 03:23:08.976	1	\N	\N	\N	APPROVED	26	FIELD_SUGUNTO_QAALIN	2026-09-24 08:29:59.435	USD	\N	Qaalin	9	2026-09-24 08:29:59.435	2	6	head	1.5jir	Hiiraan
19641	CATTLE	Suuqa xoolaha Livestock Market	465.00	2026-07-23 05:50:33.071	81	2026-07-23 05:50:33.071	1	\N	\N	\N	APPROVED	27	FIELD_BIRIMO_SAC	2026-09-24 08:29:59.435	USD	\N	Sac	8	2026-09-24 08:29:59.435	2	36852	head	3jir	Gedo
19642	CATTLE	Suuqa xoolaha Livestock Market	415.00	2026-07-25 08:17:57.165	81	2026-07-25 08:17:57.165	1	\N	\N	\N	APPROVED	27	FIELD_SUGUNTO_SAC	2026-09-24 08:29:59.435	USD	\N	Sac	8	2026-09-24 08:29:59.435	2	36852	head	3jir	Gedo
19643	CATTLE	Suuqa xoolaha Livestock Market	410.00	2026-07-27 10:45:21.26	81	2026-07-27 10:45:21.26	1	\N	\N	\N	APPROVED	27	FIELD_BIRIMO_SAC	2026-09-24 08:29:59.435	USD	\N	Sac	8	2026-09-24 08:29:59.435	2	36852	head	1jir	Bay
19644	CATTLE	Suuqa xoolaha Livestock Market	360.00	2026-07-29 13:12:45.354	81	2026-07-29 13:12:45.354	1	\N	\N	\N	APPROVED	27	FIELD_SUGUNTO_SAC	2026-09-24 08:29:59.435	USD	\N	Sac	8	2026-09-24 08:29:59.435	2	36852	head	1jir	Bay
19645	CATTLE	Suuqa xoolaha Livestock Market	435.00	2026-07-31 15:40:09.449	81	2026-07-31 15:40:09.449	1	\N	\N	\N	APPROVED	27	FIELD_BIRIMO_SAC	2026-09-24 08:29:59.435	USD	\N	Sac	8	2026-09-24 08:29:59.435	2	36852	head	1.5jir	Bakool
19646	CATTLE	Suuqa xoolaha Livestock Market	385.00	2026-08-02 18:07:33.543	81	2026-08-02 18:07:33.543	1	\N	\N	\N	APPROVED	27	FIELD_SUGUNTO_SAC	2026-09-24 08:29:59.435	USD	\N	Sac	8	2026-09-24 08:29:59.435	2	36852	head	1.5jir	Bakool
19647	CATTLE	Suuqa xoolaha Livestock Market	425.00	2026-08-04 20:34:57.638	81	2026-08-04 20:34:57.638	1	\N	\N	\N	APPROVED	27	FIELD_BIRIMO_SAC	2026-09-24 08:29:59.435	USD	\N	Sac	8	2026-09-24 08:29:59.435	2	36852	head	2jir	Hiiraan
19648	CATTLE	Suuqa xoolaha Livestock Market	375.00	2026-08-06 23:02:21.732	81	2026-08-06 23:02:21.732	1	\N	\N	\N	APPROVED	27	FIELD_SUGUNTO_SAC	2026-09-24 08:29:59.435	USD	\N	Sac	8	2026-09-24 08:29:59.435	2	36852	head	2jir	Hiiraan
19649	CATTLE	Suuqa xoolaha Livestock Market	565.00	2026-08-09 01:29:45.827	81	2026-08-09 01:29:45.827	1	\N	\N	\N	APPROVED	27	FIELD_BIRIMO_DIBI	2026-09-24 08:29:59.435	USD	\N	Dibi	8	2026-09-24 08:29:59.435	2	8	head	3jir	Gedo
19650	CATTLE	Suuqa xoolaha Livestock Market	515.00	2026-08-11 03:57:09.921	81	2026-08-11 03:57:09.921	1	\N	\N	\N	APPROVED	27	FIELD_SUGUNTO_DIBI	2026-09-24 08:29:59.435	USD	\N	Dibi	8	2026-09-24 08:29:59.435	2	8	head	3jir	Gedo
19651	CATTLE	Suuqa xoolaha Livestock Market	510.00	2026-08-13 06:24:34.016	81	2026-08-13 06:24:34.016	1	\N	\N	\N	APPROVED	27	FIELD_BIRIMO_DIBI	2026-09-24 08:29:59.435	USD	\N	Dibi	8	2026-09-24 08:29:59.435	2	8	head	1jir	Bay
19652	CATTLE	Suuqa xoolaha Livestock Market	460.00	2026-08-15 08:51:58.11	81	2026-08-15 08:51:58.11	1	\N	\N	\N	APPROVED	27	FIELD_SUGUNTO_DIBI	2026-09-24 08:29:59.435	USD	\N	Dibi	8	2026-09-24 08:29:59.435	2	8	head	1jir	Bay
19653	CATTLE	Suuqa xoolaha Livestock Market	535.00	2026-08-17 11:19:22.205	81	2026-08-17 11:19:22.205	1	\N	\N	\N	APPROVED	27	FIELD_BIRIMO_DIBI	2026-09-24 08:29:59.435	USD	\N	Dibi	8	2026-09-24 08:29:59.435	2	8	head	1.5jir	Bakool
19654	CATTLE	Suuqa xoolaha Livestock Market	485.00	2026-08-19 13:46:46.299	81	2026-08-19 13:46:46.299	1	\N	\N	\N	APPROVED	27	FIELD_SUGUNTO_DIBI	2026-09-24 08:29:59.435	USD	\N	Dibi	8	2026-09-24 08:29:59.435	2	8	head	1.5jir	Bakool
19655	CATTLE	Suuqa xoolaha Livestock Market	525.00	2026-08-21 16:14:10.394	81	2026-08-21 16:14:10.394	1	\N	\N	\N	APPROVED	27	FIELD_BIRIMO_DIBI	2026-09-24 08:29:59.435	USD	\N	Dibi	8	2026-09-24 08:29:59.435	2	8	head	2jir	Hiiraan
19656	CATTLE	Suuqa xoolaha Livestock Market	475.00	2026-08-23 18:41:34.488	81	2026-08-23 18:41:34.488	1	\N	\N	\N	APPROVED	27	FIELD_SUGUNTO_DIBI	2026-09-24 08:29:59.435	USD	\N	Dibi	8	2026-09-24 08:29:59.435	2	8	head	2jir	Hiiraan
19657	CATTLE	Suuqa xoolaha Livestock Market	315.00	2026-08-25 21:08:58.583	81	2026-08-25 21:08:58.583	1	\N	\N	\N	APPROVED	27	FIELD_BIRIMO_WEYL	2026-09-24 08:29:59.435	USD	\N	Weyl	8	2026-09-24 08:29:59.435	2	7	head	3jir	Gedo
19658	CATTLE	Suuqa xoolaha Livestock Market	265.00	2026-08-27 23:36:22.677	81	2026-08-27 23:36:22.677	1	\N	\N	\N	APPROVED	27	FIELD_SUGUNTO_WEYL	2026-09-24 08:29:59.435	USD	\N	Weyl	8	2026-09-24 08:29:59.435	2	7	head	3jir	Gedo
19659	CATTLE	Suuqa xoolaha Livestock Market	260.00	2026-08-30 02:03:46.772	81	2026-08-30 02:03:46.772	1	\N	\N	\N	APPROVED	27	FIELD_BIRIMO_WEYL	2026-09-24 08:29:59.435	USD	\N	Weyl	8	2026-09-24 08:29:59.435	2	7	head	1jir	Bay
19660	CATTLE	Suuqa xoolaha Livestock Market	210.00	2026-09-01 04:31:10.866	81	2026-09-01 04:31:10.866	1	\N	\N	\N	APPROVED	27	FIELD_SUGUNTO_WEYL	2026-09-24 08:29:59.435	USD	\N	Weyl	8	2026-09-24 08:29:59.435	2	7	head	1jir	Bay
19661	CATTLE	Suuqa xoolaha Livestock Market	285.00	2026-09-03 06:58:34.961	81	2026-09-03 06:58:34.961	1	\N	\N	\N	APPROVED	27	FIELD_BIRIMO_WEYL	2026-09-24 08:29:59.435	USD	\N	Weyl	8	2026-09-24 08:29:59.435	2	7	head	1.5jir	Bakool
19662	CATTLE	Suuqa xoolaha Livestock Market	235.00	2026-09-05 09:25:59.055	81	2026-09-05 09:25:59.055	1	\N	\N	\N	APPROVED	27	FIELD_SUGUNTO_WEYL	2026-09-24 08:29:59.435	USD	\N	Weyl	8	2026-09-24 08:29:59.435	2	7	head	1.5jir	Bakool
19663	CATTLE	Suuqa xoolaha Livestock Market	275.00	2026-09-07 11:53:23.15	81	2026-09-07 11:53:23.15	1	\N	\N	\N	APPROVED	27	FIELD_BIRIMO_WEYL	2026-09-24 08:29:59.435	USD	\N	Weyl	8	2026-09-24 08:29:59.435	2	7	head	2jir	Hiiraan
19664	CATTLE	Suuqa xoolaha Livestock Market	225.00	2026-09-09 14:20:47.244	81	2026-09-09 14:20:47.244	1	\N	\N	\N	APPROVED	27	FIELD_SUGUNTO_WEYL	2026-09-24 08:29:59.435	USD	\N	Weyl	8	2026-09-24 08:29:59.435	2	7	head	2jir	Hiiraan
19665	CATTLE	Suuqa xoolaha Livestock Market	265.00	2026-09-11 16:48:11.339	81	2026-09-11 16:48:11.339	1	\N	\N	\N	APPROVED	27	FIELD_BIRIMO_QAALIN	2026-09-24 08:29:59.435	USD	\N	Qaalin	8	2026-09-24 08:29:59.435	2	6	head	3jir	Gedo
19666	CATTLE	Suuqa xoolaha Livestock Market	215.00	2026-09-13 19:15:35.433	81	2026-09-13 19:15:35.433	1	\N	\N	\N	APPROVED	27	FIELD_SUGUNTO_QAALIN	2026-09-24 08:29:59.435	USD	\N	Qaalin	8	2026-09-24 08:29:59.435	2	6	head	3jir	Gedo
19667	CATTLE	Suuqa xoolaha Livestock Market	210.00	2026-09-15 21:42:59.528	81	2026-09-15 21:42:59.528	1	\N	\N	\N	APPROVED	27	FIELD_BIRIMO_QAALIN	2026-09-24 08:29:59.435	USD	\N	Qaalin	8	2026-09-24 08:29:59.435	2	6	head	1jir	Bay
19668	CATTLE	Suuqa xoolaha Livestock Market	160.00	2026-09-18 00:10:23.622	81	2026-09-18 00:10:23.622	1	\N	\N	\N	APPROVED	27	FIELD_SUGUNTO_QAALIN	2026-09-24 08:29:59.435	USD	\N	Qaalin	8	2026-09-24 08:29:59.435	2	6	head	1jir	Bay
19669	CATTLE	Suuqa xoolaha Livestock Market	235.00	2026-09-20 02:37:47.717	81	2026-09-20 02:37:47.717	1	\N	\N	\N	APPROVED	27	FIELD_BIRIMO_QAALIN	2026-09-24 08:29:59.435	USD	\N	Qaalin	8	2026-09-24 08:29:59.435	2	6	head	1.5jir	Bakool
19712	GOAT	Deniile livestock market	61.00	2026-02-19 20:22:53.023	78	2026-02-19 20:22:53.023	1	\N	\N	\N	APPROVED	24	FIELD_SUGUNTO_NEYL	2026-09-24 08:30:03.105	USD	\N	Neyl	6	2026-09-24 08:30:03.105	3	2893	head	3jir	Hiiraan
19670	CATTLE	Suuqa xoolaha Livestock Market	185.00	2026-09-22 05:05:11.811	81	2026-09-22 05:05:11.811	1	\N	\N	\N	APPROVED	27	FIELD_SUGUNTO_QAALIN	2026-09-24 08:29:59.435	USD	\N	Qaalin	8	2026-09-24 08:29:59.435	2	6	head	1.5jir	Bakool
19671	CATTLE	Suuqa xoolaha Livestock Market	225.00	2026-09-24 07:32:35.906	81	2026-09-24 07:32:35.906	1	\N	\N	\N	APPROVED	27	FIELD_BIRIMO_QAALIN	2026-09-24 08:29:59.435	USD	\N	Qaalin	8	2026-09-24 08:29:59.435	2	6	head	2jir	Hiiraan
19672	CATTLE	Suuqa xoolaha Livestock Market	175.00	2026-09-26 10:00:00	81	2026-09-26 10:00:00	1	\N	\N	\N	APPROVED	27	FIELD_SUGUNTO_QAALIN	2026-09-24 08:29:59.435	USD	\N	Qaalin	8	2026-09-24 08:29:59.435	2	6	head	2jir	Hiiraan
19673	GOAT	Deniile livestock market	102.00	2026-01-02 10:00:00	78	2026-01-02 10:00:00	1	\N	\N	\N	APPROVED	24	FIELD_BIRIMO_LAX	2026-09-24 08:30:03.105	USD	\N	Lax	6	2026-09-24 08:30:03.105	3	2882	head	1jir	Gedo
19674	GOAT	Deniile livestock market	52.00	2026-01-03 15:48:16.744	78	2026-01-03 15:48:16.744	1	\N	\N	\N	APPROVED	24	FIELD_SUGUNTO_LAX	2026-09-24 08:30:03.105	USD	\N	Lax	6	2026-09-24 08:30:03.105	3	2882	head	1jir	Gedo
19675	GOAT	Deniile livestock market	100.00	2026-01-04 21:36:33.488	78	2026-01-04 21:36:33.488	1	\N	\N	\N	APPROVED	24	FIELD_BIRIMO_LAX	2026-09-24 08:30:03.105	USD	\N	Lax	6	2026-09-24 08:30:03.105	3	2882	head	1.5jir	Bay
19676	GOAT	Deniile livestock market	50.00	2026-01-06 03:24:50.233	78	2026-01-06 03:24:50.233	1	\N	\N	\N	APPROVED	24	FIELD_SUGUNTO_LAX	2026-09-24 08:30:03.105	USD	\N	Lax	6	2026-09-24 08:30:03.105	3	2882	head	1.5jir	Bay
19677	GOAT	Deniile livestock market	110.00	2026-01-07 09:13:06.977	78	2026-01-07 09:13:06.977	1	\N	\N	\N	APPROVED	24	FIELD_BIRIMO_LAX	2026-09-24 08:30:03.105	USD	\N	Lax	6	2026-09-24 08:30:03.105	3	2882	head	2jir	Bakool
19678	GOAT	Deniile livestock market	60.00	2026-01-08 15:01:23.721	78	2026-01-08 15:01:23.721	1	\N	\N	\N	APPROVED	24	FIELD_SUGUNTO_LAX	2026-09-24 08:30:03.105	USD	\N	Lax	6	2026-09-24 08:30:03.105	3	2882	head	2jir	Bakool
19679	GOAT	Deniile livestock market	106.00	2026-01-09 20:49:40.465	78	2026-01-09 20:49:40.465	1	\N	\N	\N	APPROVED	24	FIELD_BIRIMO_LAX	2026-09-24 08:30:03.105	USD	\N	Lax	6	2026-09-24 08:30:03.105	3	2882	head	3jir	Hiiraan
19680	GOAT	Deniile livestock market	56.00	2026-01-11 02:37:57.209	78	2026-01-11 02:37:57.209	1	\N	\N	\N	APPROVED	24	FIELD_SUGUNTO_LAX	2026-09-24 08:30:03.105	USD	\N	Lax	6	2026-09-24 08:30:03.105	3	2882	head	3jir	Hiiraan
19681	GOAT	Deniile livestock market	127.00	2026-01-12 08:26:13.953	78	2026-01-12 08:26:13.953	1	\N	\N	\N	APPROVED	24	FIELD_BIRIMO_WAN	2026-09-24 08:30:03.105	USD	\N	Wan	6	2026-09-24 08:30:03.105	3	2885	head	1jir	Gedo
19682	GOAT	Deniile livestock market	77.00	2026-01-13 14:14:30.698	78	2026-01-13 14:14:30.698	1	\N	\N	\N	APPROVED	24	FIELD_SUGUNTO_WAN	2026-09-24 08:30:03.105	USD	\N	Wan	6	2026-09-24 08:30:03.105	3	2885	head	1jir	Gedo
19683	GOAT	Deniile livestock market	125.00	2026-01-14 20:02:47.442	78	2026-01-14 20:02:47.442	1	\N	\N	\N	APPROVED	24	FIELD_BIRIMO_WAN	2026-09-24 08:30:03.105	USD	\N	Wan	6	2026-09-24 08:30:03.105	3	2885	head	1.5jir	Bay
19684	GOAT	Deniile livestock market	75.00	2026-01-16 01:51:04.186	78	2026-01-16 01:51:04.186	1	\N	\N	\N	APPROVED	24	FIELD_SUGUNTO_WAN	2026-09-24 08:30:03.105	USD	\N	Wan	6	2026-09-24 08:30:03.105	3	2885	head	1.5jir	Bay
19685	GOAT	Deniile livestock market	135.00	2026-01-17 07:39:20.93	78	2026-01-17 07:39:20.93	1	\N	\N	\N	APPROVED	24	FIELD_BIRIMO_WAN	2026-09-24 08:30:03.105	USD	\N	Wan	6	2026-09-24 08:30:03.105	3	2885	head	2jir	Bakool
19686	GOAT	Deniile livestock market	85.00	2026-01-18 13:27:37.674	78	2026-01-18 13:27:37.674	1	\N	\N	\N	APPROVED	24	FIELD_SUGUNTO_WAN	2026-09-24 08:30:03.105	USD	\N	Wan	6	2026-09-24 08:30:03.105	3	2885	head	2jir	Bakool
19687	GOAT	Deniile livestock market	131.00	2026-01-19 19:15:54.419	78	2026-01-19 19:15:54.419	1	\N	\N	\N	APPROVED	24	FIELD_BIRIMO_WAN	2026-09-24 08:30:03.105	USD	\N	Wan	6	2026-09-24 08:30:03.105	3	2885	head	3jir	Hiiraan
19688	GOAT	Deniile livestock market	81.00	2026-01-21 01:04:11.163	78	2026-01-21 01:04:11.163	1	\N	\N	\N	APPROVED	24	FIELD_SUGUNTO_WAN	2026-09-24 08:30:03.105	USD	\N	Wan	6	2026-09-24 08:30:03.105	3	2885	head	3jir	Hiiraan
19689	GOAT	Deniile livestock market	112.00	2026-01-22 06:52:27.907	78	2026-01-22 06:52:27.907	1	\N	\N	\N	APPROVED	24	FIELD_BIRIMO_CAYSAN	2026-09-24 08:30:03.105	USD	\N	Caysan	6	2026-09-24 08:30:03.105	3	2887	head	1jir	Gedo
19690	GOAT	Deniile livestock market	62.00	2026-01-23 12:40:44.651	78	2026-01-23 12:40:44.651	1	\N	\N	\N	APPROVED	24	FIELD_SUGUNTO_CAYSAN	2026-09-24 08:30:03.105	USD	\N	Caysan	6	2026-09-24 08:30:03.105	3	2887	head	1jir	Gedo
19691	GOAT	Deniile livestock market	110.00	2026-01-24 18:29:01.395	78	2026-01-24 18:29:01.395	1	\N	\N	\N	APPROVED	24	FIELD_BIRIMO_CAYSAN	2026-09-24 08:30:03.105	USD	\N	Caysan	6	2026-09-24 08:30:03.105	3	2887	head	1.5jir	Bay
19692	GOAT	Deniile livestock market	60.00	2026-01-26 00:17:18.14	78	2026-01-26 00:17:18.14	1	\N	\N	\N	APPROVED	24	FIELD_SUGUNTO_CAYSAN	2026-09-24 08:30:03.105	USD	\N	Caysan	6	2026-09-24 08:30:03.105	3	2887	head	1.5jir	Bay
19693	GOAT	Deniile livestock market	120.00	2026-01-27 06:05:34.884	78	2026-01-27 06:05:34.884	1	\N	\N	\N	APPROVED	24	FIELD_BIRIMO_CAYSAN	2026-09-24 08:30:03.105	USD	\N	Caysan	6	2026-09-24 08:30:03.105	3	2887	head	2jir	Bakool
19694	GOAT	Deniile livestock market	70.00	2026-01-28 11:53:51.628	78	2026-01-28 11:53:51.628	1	\N	\N	\N	APPROVED	24	FIELD_SUGUNTO_CAYSAN	2026-09-24 08:30:03.105	USD	\N	Caysan	6	2026-09-24 08:30:03.105	3	2887	head	2jir	Bakool
19695	GOAT	Deniile livestock market	116.00	2026-01-29 17:42:08.372	78	2026-01-29 17:42:08.372	1	\N	\N	\N	APPROVED	24	FIELD_BIRIMO_CAYSAN	2026-09-24 08:30:03.105	USD	\N	Caysan	6	2026-09-24 08:30:03.105	3	2887	head	3jir	Hiiraan
19696	GOAT	Deniile livestock market	66.00	2026-01-30 23:30:25.116	78	2026-01-30 23:30:25.116	1	\N	\N	\N	APPROVED	24	FIELD_SUGUNTO_CAYSAN	2026-09-24 08:30:03.105	USD	\N	Caysan	6	2026-09-24 08:30:03.105	3	2887	head	3jir	Hiiraan
19697	GOAT	Deniile livestock market	137.00	2026-02-01 05:18:41.86	78	2026-02-01 05:18:41.86	1	\N	\N	\N	APPROVED	24	FIELD_BIRIMO_ORGI	2026-09-24 08:30:03.105	USD	\N	Orgi	6	2026-09-24 08:30:03.105	3	2890	head	1jir	Gedo
19698	GOAT	Deniile livestock market	87.00	2026-02-02 11:06:58.605	78	2026-02-02 11:06:58.605	1	\N	\N	\N	APPROVED	24	FIELD_SUGUNTO_ORGI	2026-09-24 08:30:03.105	USD	\N	Orgi	6	2026-09-24 08:30:03.105	3	2890	head	1jir	Gedo
19699	GOAT	Deniile livestock market	135.00	2026-02-03 16:55:15.349	78	2026-02-03 16:55:15.349	1	\N	\N	\N	APPROVED	24	FIELD_BIRIMO_ORGI	2026-09-24 08:30:03.105	USD	\N	Orgi	6	2026-09-24 08:30:03.105	3	2890	head	1.5jir	Bay
19700	GOAT	Deniile livestock market	85.00	2026-02-04 22:43:32.093	78	2026-02-04 22:43:32.093	1	\N	\N	\N	APPROVED	24	FIELD_SUGUNTO_ORGI	2026-09-24 08:30:03.105	USD	\N	Orgi	6	2026-09-24 08:30:03.105	3	2890	head	1.5jir	Bay
19701	GOAT	Deniile livestock market	145.00	2026-02-06 04:31:48.837	78	2026-02-06 04:31:48.837	1	\N	\N	\N	APPROVED	24	FIELD_BIRIMO_ORGI	2026-09-24 08:30:03.105	USD	\N	Orgi	6	2026-09-24 08:30:03.105	3	2890	head	2jir	Bakool
19702	GOAT	Deniile livestock market	95.00	2026-02-07 10:20:05.581	78	2026-02-07 10:20:05.581	1	\N	\N	\N	APPROVED	24	FIELD_SUGUNTO_ORGI	2026-09-24 08:30:03.105	USD	\N	Orgi	6	2026-09-24 08:30:03.105	3	2890	head	2jir	Bakool
19703	GOAT	Deniile livestock market	141.00	2026-02-08 16:08:22.326	78	2026-02-08 16:08:22.326	1	\N	\N	\N	APPROVED	24	FIELD_BIRIMO_ORGI	2026-09-24 08:30:03.105	USD	\N	Orgi	6	2026-09-24 08:30:03.105	3	2890	head	3jir	Hiiraan
19704	GOAT	Deniile livestock market	91.00	2026-02-09 21:56:39.07	78	2026-02-09 21:56:39.07	1	\N	\N	\N	APPROVED	24	FIELD_SUGUNTO_ORGI	2026-09-24 08:30:03.105	USD	\N	Orgi	6	2026-09-24 08:30:03.105	3	2890	head	3jir	Hiiraan
19705	GOAT	Deniile livestock market	107.00	2026-02-11 03:44:55.814	78	2026-02-11 03:44:55.814	1	\N	\N	\N	APPROVED	24	FIELD_BIRIMO_NEYL	2026-09-24 08:30:03.105	USD	\N	Neyl	6	2026-09-24 08:30:03.105	3	2893	head	1jir	Gedo
19706	GOAT	Deniile livestock market	57.00	2026-02-12 09:33:12.558	78	2026-02-12 09:33:12.558	1	\N	\N	\N	APPROVED	24	FIELD_SUGUNTO_NEYL	2026-09-24 08:30:03.105	USD	\N	Neyl	6	2026-09-24 08:30:03.105	3	2893	head	1jir	Gedo
19707	GOAT	Deniile livestock market	105.00	2026-02-13 15:21:29.302	78	2026-02-13 15:21:29.302	1	\N	\N	\N	APPROVED	24	FIELD_BIRIMO_NEYL	2026-09-24 08:30:03.105	USD	\N	Neyl	6	2026-09-24 08:30:03.105	3	2893	head	1.5jir	Bay
19708	GOAT	Deniile livestock market	55.00	2026-02-14 21:09:46.047	78	2026-02-14 21:09:46.047	1	\N	\N	\N	APPROVED	24	FIELD_SUGUNTO_NEYL	2026-09-24 08:30:03.105	USD	\N	Neyl	6	2026-09-24 08:30:03.105	3	2893	head	1.5jir	Bay
19709	GOAT	Deniile livestock market	115.00	2026-02-16 02:58:02.791	78	2026-02-16 02:58:02.791	1	\N	\N	\N	APPROVED	24	FIELD_BIRIMO_NEYL	2026-09-24 08:30:03.105	USD	\N	Neyl	6	2026-09-24 08:30:03.105	3	2893	head	2jir	Bakool
19710	GOAT	Deniile livestock market	65.00	2026-02-17 08:46:19.535	78	2026-02-17 08:46:19.535	1	\N	\N	\N	APPROVED	24	FIELD_SUGUNTO_NEYL	2026-09-24 08:30:03.105	USD	\N	Neyl	6	2026-09-24 08:30:03.105	3	2893	head	2jir	Bakool
19711	GOAT	Deniile livestock market	111.00	2026-02-18 14:34:36.279	78	2026-02-18 14:34:36.279	1	\N	\N	\N	APPROVED	24	FIELD_BIRIMO_NEYL	2026-09-24 08:30:03.105	USD	\N	Neyl	6	2026-09-24 08:30:03.105	3	2893	head	3jir	Hiiraan
19713	GOAT	Deniile livestock market	119.00	2026-02-21 02:11:09.767	78	2026-02-21 02:11:09.767	1	\N	\N	\N	APPROVED	24	FIELD_BIRIMO_RI	2026-09-24 08:30:03.105	USD	\N	Ri	6	2026-09-24 08:30:03.105	3	13	head	1jir	Gedo
19714	GOAT	Deniile livestock market	69.00	2026-02-22 07:59:26.512	78	2026-02-22 07:59:26.512	1	\N	\N	\N	APPROVED	24	FIELD_SUGUNTO_RI	2026-09-24 08:30:03.105	USD	\N	Ri	6	2026-09-24 08:30:03.105	3	13	head	1jir	Gedo
19715	GOAT	Deniile livestock market	117.00	2026-02-23 13:47:43.256	78	2026-02-23 13:47:43.256	1	\N	\N	\N	APPROVED	24	FIELD_BIRIMO_RI	2026-09-24 08:30:03.105	USD	\N	Ri	6	2026-09-24 08:30:03.105	3	13	head	1.5jir	Bay
19716	GOAT	Deniile livestock market	67.00	2026-02-24 19:36:00	78	2026-02-24 19:36:00	1	\N	\N	\N	APPROVED	24	FIELD_SUGUNTO_RI	2026-09-24 08:30:03.105	USD	\N	Ri	6	2026-09-24 08:30:03.105	3	13	head	1.5jir	Bay
19717	GOAT	Deniile livestock market	127.00	2026-02-26 01:24:16.744	78	2026-02-26 01:24:16.744	1	\N	\N	\N	APPROVED	24	FIELD_BIRIMO_RI	2026-09-24 08:30:03.105	USD	\N	Ri	6	2026-09-24 08:30:03.105	3	13	head	2jir	Bakool
19718	GOAT	Deniile livestock market	77.00	2026-02-27 07:12:33.488	78	2026-02-27 07:12:33.488	1	\N	\N	\N	APPROVED	24	FIELD_SUGUNTO_RI	2026-09-24 08:30:03.105	USD	\N	Ri	6	2026-09-24 08:30:03.105	3	13	head	2jir	Bakool
19719	GOAT	Deniile livestock market	123.00	2026-02-28 13:00:50.233	78	2026-02-28 13:00:50.233	1	\N	\N	\N	APPROVED	24	FIELD_BIRIMO_RI	2026-09-24 08:30:03.105	USD	\N	Ri	6	2026-09-24 08:30:03.105	3	13	head	3jir	Hiiraan
19720	GOAT	Deniile livestock market	73.00	2026-03-01 18:49:06.977	78	2026-03-01 18:49:06.977	1	\N	\N	\N	APPROVED	24	FIELD_SUGUNTO_RI	2026-09-24 08:30:03.105	USD	\N	Ri	6	2026-09-24 08:30:03.105	3	13	head	3jir	Hiiraan
19721	GOAT	Deniile livestock market	92.00	2026-03-03 00:37:23.721	78	2026-03-03 00:37:23.721	1	\N	\N	\N	APPROVED	24	FIELD_BIRIMO_WAXAR	2026-09-24 08:30:03.105	USD	\N	Waxar	6	2026-09-24 08:30:03.105	3	19391	head	1jir	Gedo
19722	GOAT	Deniile livestock market	42.00	2026-03-04 06:25:40.465	78	2026-03-04 06:25:40.465	1	\N	\N	\N	APPROVED	24	FIELD_SUGUNTO_WAXAR	2026-09-24 08:30:03.105	USD	\N	Waxar	6	2026-09-24 08:30:03.105	3	19391	head	1jir	Gedo
19723	GOAT	Deniile livestock market	90.00	2026-03-05 12:13:57.209	78	2026-03-05 12:13:57.209	1	\N	\N	\N	APPROVED	24	FIELD_BIRIMO_WAXAR	2026-09-24 08:30:03.105	USD	\N	Waxar	6	2026-09-24 08:30:03.105	3	19391	head	1.5jir	Bay
19724	GOAT	Deniile livestock market	40.00	2026-03-06 18:02:13.953	78	2026-03-06 18:02:13.953	1	\N	\N	\N	APPROVED	24	FIELD_SUGUNTO_WAXAR	2026-09-24 08:30:03.105	USD	\N	Waxar	6	2026-09-24 08:30:03.105	3	19391	head	1.5jir	Bay
19725	GOAT	Deniile livestock market	100.00	2026-03-07 23:50:30.698	78	2026-03-07 23:50:30.698	1	\N	\N	\N	APPROVED	24	FIELD_BIRIMO_WAXAR	2026-09-24 08:30:03.105	USD	\N	Waxar	6	2026-09-24 08:30:03.105	3	19391	head	2jir	Bakool
19726	GOAT	Deniile livestock market	50.00	2026-03-09 05:38:47.442	78	2026-03-09 05:38:47.442	1	\N	\N	\N	APPROVED	24	FIELD_SUGUNTO_WAXAR	2026-09-24 08:30:03.105	USD	\N	Waxar	6	2026-09-24 08:30:03.105	3	19391	head	2jir	Bakool
19727	GOAT	Deniile livestock market	96.00	2026-03-10 11:27:04.186	78	2026-03-10 11:27:04.186	1	\N	\N	\N	APPROVED	24	FIELD_BIRIMO_WAXAR	2026-09-24 08:30:03.105	USD	\N	Waxar	6	2026-09-24 08:30:03.105	3	19391	head	3jir	Hiiraan
19728	GOAT	Deniile livestock market	46.00	2026-03-11 17:15:20.93	78	2026-03-11 17:15:20.93	1	\N	\N	\N	APPROVED	24	FIELD_SUGUNTO_WAXAR	2026-09-24 08:30:03.105	USD	\N	Waxar	6	2026-09-24 08:30:03.105	3	19391	head	3jir	Hiiraan
19729	GOAT	Deniile livestock market	97.00	2026-03-12 23:03:37.674	78	2026-03-12 23:03:37.674	1	\N	\N	\N	APPROVED	24	FIELD_BIRIMO_SABEEN	2026-09-24 08:30:03.105	USD	\N	Sabeen	6	2026-09-24 08:30:03.105	3	19401	head	1jir	Gedo
19730	GOAT	Deniile livestock market	47.00	2026-03-14 04:51:54.419	78	2026-03-14 04:51:54.419	1	\N	\N	\N	APPROVED	24	FIELD_SUGUNTO_SABEEN	2026-09-24 08:30:03.105	USD	\N	Sabeen	6	2026-09-24 08:30:03.105	3	19401	head	1jir	Gedo
19731	GOAT	Deniile livestock market	95.00	2026-03-15 10:40:11.163	78	2026-03-15 10:40:11.163	1	\N	\N	\N	APPROVED	24	FIELD_BIRIMO_SABEEN	2026-09-24 08:30:03.105	USD	\N	Sabeen	6	2026-09-24 08:30:03.105	3	19401	head	1.5jir	Bay
19732	GOAT	Deniile livestock market	45.00	2026-03-16 16:28:27.907	78	2026-03-16 16:28:27.907	1	\N	\N	\N	APPROVED	24	FIELD_SUGUNTO_SABEEN	2026-09-24 08:30:03.105	USD	\N	Sabeen	6	2026-09-24 08:30:03.105	3	19401	head	1.5jir	Bay
19733	GOAT	Deniile livestock market	105.00	2026-03-17 22:16:44.651	78	2026-03-17 22:16:44.651	1	\N	\N	\N	APPROVED	24	FIELD_BIRIMO_SABEEN	2026-09-24 08:30:03.105	USD	\N	Sabeen	6	2026-09-24 08:30:03.105	3	19401	head	2jir	Bakool
19734	GOAT	Deniile livestock market	55.00	2026-03-19 04:05:01.395	78	2026-03-19 04:05:01.395	1	\N	\N	\N	APPROVED	24	FIELD_SUGUNTO_SABEEN	2026-09-24 08:30:03.105	USD	\N	Sabeen	6	2026-09-24 08:30:03.105	3	19401	head	2jir	Bakool
19735	GOAT	Deniile livestock market	101.00	2026-03-20 09:53:18.14	78	2026-03-20 09:53:18.14	1	\N	\N	\N	APPROVED	24	FIELD_BIRIMO_SABEEN	2026-09-24 08:30:03.105	USD	\N	Sabeen	6	2026-09-24 08:30:03.105	3	19401	head	3jir	Hiiraan
19736	GOAT	Deniile livestock market	51.00	2026-03-21 15:41:34.884	78	2026-03-21 15:41:34.884	1	\N	\N	\N	APPROVED	24	FIELD_SUGUNTO_SABEEN	2026-09-24 08:30:03.105	USD	\N	Sabeen	6	2026-09-24 08:30:03.105	3	19401	head	3jir	Hiiraan
19737	GOAT	Deniile livestock market	102.00	2026-03-22 21:29:51.628	78	2026-03-22 21:29:51.628	1	\N	\N	\N	APPROVED	24	FIELD_BIRIMO_SUMAL	2026-09-24 08:30:03.105	USD	\N	Sumal	6	2026-09-24 08:30:03.105	3	19406	head	1jir	Gedo
19738	GOAT	Deniile livestock market	52.00	2026-03-24 03:18:08.372	78	2026-03-24 03:18:08.372	1	\N	\N	\N	APPROVED	24	FIELD_SUGUNTO_SUMAL	2026-09-24 08:30:03.105	USD	\N	Sumal	6	2026-09-24 08:30:03.105	3	19406	head	1jir	Gedo
19739	GOAT	Deniile livestock market	100.00	2026-03-25 09:06:25.116	78	2026-03-25 09:06:25.116	1	\N	\N	\N	APPROVED	24	FIELD_BIRIMO_SUMAL	2026-09-24 08:30:03.105	USD	\N	Sumal	6	2026-09-24 08:30:03.105	3	19406	head	1.5jir	Bay
19740	GOAT	Deniile livestock market	50.00	2026-03-26 14:54:41.86	78	2026-03-26 14:54:41.86	1	\N	\N	\N	APPROVED	24	FIELD_SUGUNTO_SUMAL	2026-09-24 08:30:03.105	USD	\N	Sumal	6	2026-09-24 08:30:03.105	3	19406	head	1.5jir	Bay
19741	GOAT	Deniile livestock market	110.00	2026-03-27 20:42:58.605	78	2026-03-27 20:42:58.605	1	\N	\N	\N	APPROVED	24	FIELD_BIRIMO_SUMAL	2026-09-24 08:30:03.105	USD	\N	Sumal	6	2026-09-24 08:30:03.105	3	19406	head	2jir	Bakool
19742	GOAT	Deniile livestock market	60.00	2026-03-29 02:31:15.349	78	2026-03-29 02:31:15.349	1	\N	\N	\N	APPROVED	24	FIELD_SUGUNTO_SUMAL	2026-09-24 08:30:03.105	USD	\N	Sumal	6	2026-09-24 08:30:03.105	3	19406	head	2jir	Bakool
19743	GOAT	Deniile livestock market	106.00	2026-03-30 08:19:32.093	78	2026-03-30 08:19:32.093	1	\N	\N	\N	APPROVED	24	FIELD_BIRIMO_SUMAL	2026-09-24 08:30:03.105	USD	\N	Sumal	6	2026-09-24 08:30:03.105	3	19406	head	3jir	Hiiraan
19744	GOAT	Deniile livestock market	56.00	2026-03-31 14:07:48.837	78	2026-03-31 14:07:48.837	1	\N	\N	\N	APPROVED	24	FIELD_SUGUNTO_SUMAL	2026-09-24 08:30:03.105	USD	\N	Sumal	6	2026-09-24 08:30:03.105	3	19406	head	3jir	Hiiraan
19745	GOAT	Suuqa xoolaha Livestock Market	116.00	2026-04-01 19:56:05.581	79	2026-04-01 19:56:05.581	1	\N	\N	\N	APPROVED	25	FIELD_BIRIMO_LAX	2026-09-24 08:30:03.105	USD	\N	Lax	8	2026-09-24 08:30:03.105	3	2882	head	1.5jir	Gedo
19746	GOAT	Suuqa xoolaha Livestock Market	66.00	2026-04-03 01:44:22.326	79	2026-04-03 01:44:22.326	1	\N	\N	\N	APPROVED	25	FIELD_SUGUNTO_LAX	2026-09-24 08:30:03.105	USD	\N	Lax	8	2026-09-24 08:30:03.105	3	2882	head	1.5jir	Gedo
19747	GOAT	Suuqa xoolaha Livestock Market	113.00	2026-04-04 07:32:39.07	79	2026-04-04 07:32:39.07	1	\N	\N	\N	APPROVED	25	FIELD_BIRIMO_LAX	2026-09-24 08:30:03.105	USD	\N	Lax	8	2026-09-24 08:30:03.105	3	2882	head	2jir	Bay
19748	GOAT	Suuqa xoolaha Livestock Market	63.00	2026-04-05 13:20:55.814	79	2026-04-05 13:20:55.814	1	\N	\N	\N	APPROVED	25	FIELD_SUGUNTO_LAX	2026-09-24 08:30:03.105	USD	\N	Lax	8	2026-09-24 08:30:03.105	3	2882	head	2jir	Bay
19749	GOAT	Suuqa xoolaha Livestock Market	123.00	2026-04-06 19:09:12.558	79	2026-04-06 19:09:12.558	1	\N	\N	\N	APPROVED	25	FIELD_BIRIMO_LAX	2026-09-24 08:30:03.105	USD	\N	Lax	8	2026-09-24 08:30:03.105	3	2882	head	3jir	Bakool
19750	GOAT	Suuqa xoolaha Livestock Market	73.00	2026-04-08 00:57:29.302	79	2026-04-08 00:57:29.302	1	\N	\N	\N	APPROVED	25	FIELD_SUGUNTO_LAX	2026-09-24 08:30:03.105	USD	\N	Lax	8	2026-09-24 08:30:03.105	3	2882	head	3jir	Bakool
19751	GOAT	Suuqa xoolaha Livestock Market	98.00	2026-04-09 06:45:46.047	79	2026-04-09 06:45:46.047	1	\N	\N	\N	APPROVED	25	FIELD_BIRIMO_LAX	2026-09-24 08:30:03.105	USD	\N	Lax	8	2026-09-24 08:30:03.105	3	2882	head	1jir	Hiiraan
19752	GOAT	Suuqa xoolaha Livestock Market	48.00	2026-04-10 12:34:02.791	79	2026-04-10 12:34:02.791	1	\N	\N	\N	APPROVED	25	FIELD_SUGUNTO_LAX	2026-09-24 08:30:03.105	USD	\N	Lax	8	2026-09-24 08:30:03.105	3	2882	head	1jir	Hiiraan
19753	GOAT	Suuqa xoolaha Livestock Market	141.00	2026-04-11 18:22:19.535	79	2026-04-11 18:22:19.535	1	\N	\N	\N	APPROVED	25	FIELD_BIRIMO_WAN	2026-09-24 08:30:03.105	USD	\N	Wan	8	2026-09-24 08:30:03.105	3	2885	head	1.5jir	Gedo
19754	GOAT	Suuqa xoolaha Livestock Market	91.00	2026-04-13 00:10:36.279	79	2026-04-13 00:10:36.279	1	\N	\N	\N	APPROVED	25	FIELD_SUGUNTO_WAN	2026-09-24 08:30:03.105	USD	\N	Wan	8	2026-09-24 08:30:03.105	3	2885	head	1.5jir	Gedo
19755	GOAT	Suuqa xoolaha Livestock Market	138.00	2026-04-14 05:58:53.023	79	2026-04-14 05:58:53.023	1	\N	\N	\N	APPROVED	25	FIELD_BIRIMO_WAN	2026-09-24 08:30:03.105	USD	\N	Wan	8	2026-09-24 08:30:03.105	3	2885	head	2jir	Bay
19756	GOAT	Suuqa xoolaha Livestock Market	88.00	2026-04-15 11:47:09.767	79	2026-04-15 11:47:09.767	1	\N	\N	\N	APPROVED	25	FIELD_SUGUNTO_WAN	2026-09-24 08:30:03.105	USD	\N	Wan	8	2026-09-24 08:30:03.105	3	2885	head	2jir	Bay
19757	GOAT	Suuqa xoolaha Livestock Market	148.00	2026-04-16 17:35:26.512	79	2026-04-16 17:35:26.512	1	\N	\N	\N	APPROVED	25	FIELD_BIRIMO_WAN	2026-09-24 08:30:03.105	USD	\N	Wan	8	2026-09-24 08:30:03.105	3	2885	head	3jir	Bakool
19758	GOAT	Suuqa xoolaha Livestock Market	98.00	2026-04-17 23:23:43.256	79	2026-04-17 23:23:43.256	1	\N	\N	\N	APPROVED	25	FIELD_SUGUNTO_WAN	2026-09-24 08:30:03.105	USD	\N	Wan	8	2026-09-24 08:30:03.105	3	2885	head	3jir	Bakool
19759	GOAT	Suuqa xoolaha Livestock Market	123.00	2026-04-19 05:12:00	79	2026-04-19 05:12:00	1	\N	\N	\N	APPROVED	25	FIELD_BIRIMO_WAN	2026-09-24 08:30:03.105	USD	\N	Wan	8	2026-09-24 08:30:03.105	3	2885	head	1jir	Hiiraan
19760	GOAT	Suuqa xoolaha Livestock Market	73.00	2026-04-20 11:00:16.744	79	2026-04-20 11:00:16.744	1	\N	\N	\N	APPROVED	25	FIELD_SUGUNTO_WAN	2026-09-24 08:30:03.105	USD	\N	Wan	8	2026-09-24 08:30:03.105	3	2885	head	1jir	Hiiraan
19761	GOAT	Suuqa xoolaha Livestock Market	126.00	2026-04-21 16:48:33.488	79	2026-04-21 16:48:33.488	1	\N	\N	\N	APPROVED	25	FIELD_BIRIMO_CAYSAN	2026-09-24 08:30:03.105	USD	\N	Caysan	8	2026-09-24 08:30:03.105	3	2887	head	1.5jir	Gedo
19762	GOAT	Suuqa xoolaha Livestock Market	76.00	2026-04-22 22:36:50.233	79	2026-04-22 22:36:50.233	1	\N	\N	\N	APPROVED	25	FIELD_SUGUNTO_CAYSAN	2026-09-24 08:30:03.105	USD	\N	Caysan	8	2026-09-24 08:30:03.105	3	2887	head	1.5jir	Gedo
19763	GOAT	Suuqa xoolaha Livestock Market	123.00	2026-04-24 04:25:06.977	79	2026-04-24 04:25:06.977	1	\N	\N	\N	APPROVED	25	FIELD_BIRIMO_CAYSAN	2026-09-24 08:30:03.105	USD	\N	Caysan	8	2026-09-24 08:30:03.105	3	2887	head	2jir	Bay
19764	GOAT	Suuqa xoolaha Livestock Market	73.00	2026-04-25 10:13:23.721	79	2026-04-25 10:13:23.721	1	\N	\N	\N	APPROVED	25	FIELD_SUGUNTO_CAYSAN	2026-09-24 08:30:03.105	USD	\N	Caysan	8	2026-09-24 08:30:03.105	3	2887	head	2jir	Bay
19765	GOAT	Suuqa xoolaha Livestock Market	133.00	2026-04-26 16:01:40.465	79	2026-04-26 16:01:40.465	1	\N	\N	\N	APPROVED	25	FIELD_BIRIMO_CAYSAN	2026-09-24 08:30:03.105	USD	\N	Caysan	8	2026-09-24 08:30:03.105	3	2887	head	3jir	Bakool
19766	GOAT	Suuqa xoolaha Livestock Market	83.00	2026-04-27 21:49:57.209	79	2026-04-27 21:49:57.209	1	\N	\N	\N	APPROVED	25	FIELD_SUGUNTO_CAYSAN	2026-09-24 08:30:03.105	USD	\N	Caysan	8	2026-09-24 08:30:03.105	3	2887	head	3jir	Bakool
19767	GOAT	Suuqa xoolaha Livestock Market	108.00	2026-04-29 03:38:13.953	79	2026-04-29 03:38:13.953	1	\N	\N	\N	APPROVED	25	FIELD_BIRIMO_CAYSAN	2026-09-24 08:30:03.105	USD	\N	Caysan	8	2026-09-24 08:30:03.105	3	2887	head	1jir	Hiiraan
19768	GOAT	Suuqa xoolaha Livestock Market	58.00	2026-04-30 09:26:30.698	79	2026-04-30 09:26:30.698	1	\N	\N	\N	APPROVED	25	FIELD_SUGUNTO_CAYSAN	2026-09-24 08:30:03.105	USD	\N	Caysan	8	2026-09-24 08:30:03.105	3	2887	head	1jir	Hiiraan
19769	GOAT	Suuqa xoolaha Livestock Market	151.00	2026-05-01 15:14:47.442	79	2026-05-01 15:14:47.442	1	\N	\N	\N	APPROVED	25	FIELD_BIRIMO_ORGI	2026-09-24 08:30:03.105	USD	\N	Orgi	8	2026-09-24 08:30:03.105	3	2890	head	1.5jir	Gedo
19770	GOAT	Suuqa xoolaha Livestock Market	101.00	2026-05-02 21:03:04.186	79	2026-05-02 21:03:04.186	1	\N	\N	\N	APPROVED	25	FIELD_SUGUNTO_ORGI	2026-09-24 08:30:03.105	USD	\N	Orgi	8	2026-09-24 08:30:03.105	3	2890	head	1.5jir	Gedo
19771	GOAT	Suuqa xoolaha Livestock Market	148.00	2026-05-04 02:51:20.93	79	2026-05-04 02:51:20.93	1	\N	\N	\N	APPROVED	25	FIELD_BIRIMO_ORGI	2026-09-24 08:30:03.105	USD	\N	Orgi	8	2026-09-24 08:30:03.105	3	2890	head	2jir	Bay
19772	GOAT	Suuqa xoolaha Livestock Market	98.00	2026-05-05 08:39:37.674	79	2026-05-05 08:39:37.674	1	\N	\N	\N	APPROVED	25	FIELD_SUGUNTO_ORGI	2026-09-24 08:30:03.105	USD	\N	Orgi	8	2026-09-24 08:30:03.105	3	2890	head	2jir	Bay
19773	GOAT	Suuqa xoolaha Livestock Market	158.00	2026-05-06 14:27:54.419	79	2026-05-06 14:27:54.419	1	\N	\N	\N	APPROVED	25	FIELD_BIRIMO_ORGI	2026-09-24 08:30:03.105	USD	\N	Orgi	8	2026-09-24 08:30:03.105	3	2890	head	3jir	Bakool
19774	GOAT	Suuqa xoolaha Livestock Market	108.00	2026-05-07 20:16:11.163	79	2026-05-07 20:16:11.163	1	\N	\N	\N	APPROVED	25	FIELD_SUGUNTO_ORGI	2026-09-24 08:30:03.105	USD	\N	Orgi	8	2026-09-24 08:30:03.105	3	2890	head	3jir	Bakool
19775	GOAT	Suuqa xoolaha Livestock Market	133.00	2026-05-09 02:04:27.907	79	2026-05-09 02:04:27.907	1	\N	\N	\N	APPROVED	25	FIELD_BIRIMO_ORGI	2026-09-24 08:30:03.105	USD	\N	Orgi	8	2026-09-24 08:30:03.105	3	2890	head	1jir	Hiiraan
19776	GOAT	Suuqa xoolaha Livestock Market	83.00	2026-05-10 07:52:44.651	79	2026-05-10 07:52:44.651	1	\N	\N	\N	APPROVED	25	FIELD_SUGUNTO_ORGI	2026-09-24 08:30:03.105	USD	\N	Orgi	8	2026-09-24 08:30:03.105	3	2890	head	1jir	Hiiraan
19777	GOAT	Suuqa xoolaha Livestock Market	121.00	2026-05-11 13:41:01.395	79	2026-05-11 13:41:01.395	1	\N	\N	\N	APPROVED	25	FIELD_BIRIMO_NEYL	2026-09-24 08:30:03.105	USD	\N	Neyl	8	2026-09-24 08:30:03.105	3	2893	head	1.5jir	Gedo
19778	GOAT	Suuqa xoolaha Livestock Market	71.00	2026-05-12 19:29:18.14	79	2026-05-12 19:29:18.14	1	\N	\N	\N	APPROVED	25	FIELD_SUGUNTO_NEYL	2026-09-24 08:30:03.105	USD	\N	Neyl	8	2026-09-24 08:30:03.105	3	2893	head	1.5jir	Gedo
19779	GOAT	Suuqa xoolaha Livestock Market	118.00	2026-05-14 01:17:34.884	79	2026-05-14 01:17:34.884	1	\N	\N	\N	APPROVED	25	FIELD_BIRIMO_NEYL	2026-09-24 08:30:03.105	USD	\N	Neyl	8	2026-09-24 08:30:03.105	3	2893	head	2jir	Bay
19780	GOAT	Suuqa xoolaha Livestock Market	68.00	2026-05-15 07:05:51.628	79	2026-05-15 07:05:51.628	1	\N	\N	\N	APPROVED	25	FIELD_SUGUNTO_NEYL	2026-09-24 08:30:03.105	USD	\N	Neyl	8	2026-09-24 08:30:03.105	3	2893	head	2jir	Bay
19781	GOAT	Suuqa xoolaha Livestock Market	128.00	2026-05-16 12:54:08.372	79	2026-05-16 12:54:08.372	1	\N	\N	\N	APPROVED	25	FIELD_BIRIMO_NEYL	2026-09-24 08:30:03.105	USD	\N	Neyl	8	2026-09-24 08:30:03.105	3	2893	head	3jir	Bakool
19782	GOAT	Suuqa xoolaha Livestock Market	78.00	2026-05-17 18:42:25.116	79	2026-05-17 18:42:25.116	1	\N	\N	\N	APPROVED	25	FIELD_SUGUNTO_NEYL	2026-09-24 08:30:03.105	USD	\N	Neyl	8	2026-09-24 08:30:03.105	3	2893	head	3jir	Bakool
19783	GOAT	Suuqa xoolaha Livestock Market	103.00	2026-05-19 00:30:41.86	79	2026-05-19 00:30:41.86	1	\N	\N	\N	APPROVED	25	FIELD_BIRIMO_NEYL	2026-09-24 08:30:03.105	USD	\N	Neyl	8	2026-09-24 08:30:03.105	3	2893	head	1jir	Hiiraan
19784	GOAT	Suuqa xoolaha Livestock Market	53.00	2026-05-20 06:18:58.605	79	2026-05-20 06:18:58.605	1	\N	\N	\N	APPROVED	25	FIELD_SUGUNTO_NEYL	2026-09-24 08:30:03.105	USD	\N	Neyl	8	2026-09-24 08:30:03.105	3	2893	head	1jir	Hiiraan
19785	GOAT	Suuqa xoolaha Livestock Market	133.00	2026-05-21 12:07:15.349	79	2026-05-21 12:07:15.349	1	\N	\N	\N	APPROVED	25	FIELD_BIRIMO_RI	2026-09-24 08:30:03.105	USD	\N	Ri	8	2026-09-24 08:30:03.105	3	13	head	1.5jir	Gedo
19786	GOAT	Suuqa xoolaha Livestock Market	83.00	2026-05-22 17:55:32.093	79	2026-05-22 17:55:32.093	1	\N	\N	\N	APPROVED	25	FIELD_SUGUNTO_RI	2026-09-24 08:30:03.105	USD	\N	Ri	8	2026-09-24 08:30:03.105	3	13	head	1.5jir	Gedo
19787	GOAT	Suuqa xoolaha Livestock Market	130.00	2026-05-23 23:43:48.837	79	2026-05-23 23:43:48.837	1	\N	\N	\N	APPROVED	25	FIELD_BIRIMO_RI	2026-09-24 08:30:03.105	USD	\N	Ri	8	2026-09-24 08:30:03.105	3	13	head	2jir	Bay
19788	GOAT	Suuqa xoolaha Livestock Market	80.00	2026-05-25 05:32:05.581	79	2026-05-25 05:32:05.581	1	\N	\N	\N	APPROVED	25	FIELD_SUGUNTO_RI	2026-09-24 08:30:03.105	USD	\N	Ri	8	2026-09-24 08:30:03.105	3	13	head	2jir	Bay
19789	GOAT	Suuqa xoolaha Livestock Market	140.00	2026-05-26 11:20:22.326	79	2026-05-26 11:20:22.326	1	\N	\N	\N	APPROVED	25	FIELD_BIRIMO_RI	2026-09-24 08:30:03.105	USD	\N	Ri	8	2026-09-24 08:30:03.105	3	13	head	3jir	Bakool
19790	GOAT	Suuqa xoolaha Livestock Market	90.00	2026-05-27 17:08:39.07	79	2026-05-27 17:08:39.07	1	\N	\N	\N	APPROVED	25	FIELD_SUGUNTO_RI	2026-09-24 08:30:03.105	USD	\N	Ri	8	2026-09-24 08:30:03.105	3	13	head	3jir	Bakool
19791	GOAT	Suuqa xoolaha Livestock Market	115.00	2026-05-28 22:56:55.814	79	2026-05-28 22:56:55.814	1	\N	\N	\N	APPROVED	25	FIELD_BIRIMO_RI	2026-09-24 08:30:03.105	USD	\N	Ri	8	2026-09-24 08:30:03.105	3	13	head	1jir	Hiiraan
19792	GOAT	Suuqa xoolaha Livestock Market	65.00	2026-05-30 04:45:12.558	79	2026-05-30 04:45:12.558	1	\N	\N	\N	APPROVED	25	FIELD_SUGUNTO_RI	2026-09-24 08:30:03.105	USD	\N	Ri	8	2026-09-24 08:30:03.105	3	13	head	1jir	Hiiraan
19793	GOAT	Suuqa xoolaha Livestock Market	106.00	2026-05-31 10:33:29.302	79	2026-05-31 10:33:29.302	1	\N	\N	\N	APPROVED	25	FIELD_BIRIMO_WAXAR	2026-09-24 08:30:03.105	USD	\N	Waxar	8	2026-09-24 08:30:03.105	3	19391	head	1.5jir	Gedo
19794	GOAT	Suuqa xoolaha Livestock Market	56.00	2026-06-01 16:21:46.047	79	2026-06-01 16:21:46.047	1	\N	\N	\N	APPROVED	25	FIELD_SUGUNTO_WAXAR	2026-09-24 08:30:03.105	USD	\N	Waxar	8	2026-09-24 08:30:03.105	3	19391	head	1.5jir	Gedo
19795	GOAT	Suuqa xoolaha Livestock Market	103.00	2026-06-02 22:10:02.791	79	2026-06-02 22:10:02.791	1	\N	\N	\N	APPROVED	25	FIELD_BIRIMO_WAXAR	2026-09-24 08:30:03.105	USD	\N	Waxar	8	2026-09-24 08:30:03.105	3	19391	head	2jir	Bay
19796	GOAT	Suuqa xoolaha Livestock Market	53.00	2026-06-04 03:58:19.535	79	2026-06-04 03:58:19.535	1	\N	\N	\N	APPROVED	25	FIELD_SUGUNTO_WAXAR	2026-09-24 08:30:03.105	USD	\N	Waxar	8	2026-09-24 08:30:03.105	3	19391	head	2jir	Bay
19797	GOAT	Suuqa xoolaha Livestock Market	113.00	2026-06-05 09:46:36.279	79	2026-06-05 09:46:36.279	1	\N	\N	\N	APPROVED	25	FIELD_BIRIMO_WAXAR	2026-09-24 08:30:03.105	USD	\N	Waxar	8	2026-09-24 08:30:03.105	3	19391	head	3jir	Bakool
19798	GOAT	Suuqa xoolaha Livestock Market	63.00	2026-06-06 15:34:53.023	79	2026-06-06 15:34:53.023	1	\N	\N	\N	APPROVED	25	FIELD_SUGUNTO_WAXAR	2026-09-24 08:30:03.105	USD	\N	Waxar	8	2026-09-24 08:30:03.105	3	19391	head	3jir	Bakool
19799	GOAT	Suuqa xoolaha Livestock Market	88.00	2026-06-07 21:23:09.767	79	2026-06-07 21:23:09.767	1	\N	\N	\N	APPROVED	25	FIELD_BIRIMO_WAXAR	2026-09-24 08:30:03.105	USD	\N	Waxar	8	2026-09-24 08:30:03.105	3	19391	head	1jir	Hiiraan
19800	GOAT	Suuqa xoolaha Livestock Market	38.00	2026-06-09 03:11:26.512	79	2026-06-09 03:11:26.512	1	\N	\N	\N	APPROVED	25	FIELD_SUGUNTO_WAXAR	2026-09-24 08:30:03.105	USD	\N	Waxar	8	2026-09-24 08:30:03.105	3	19391	head	1jir	Hiiraan
19801	GOAT	Suuqa xoolaha Livestock Market	111.00	2026-06-10 08:59:43.256	79	2026-06-10 08:59:43.256	1	\N	\N	\N	APPROVED	25	FIELD_BIRIMO_SABEEN	2026-09-24 08:30:03.105	USD	\N	Sabeen	8	2026-09-24 08:30:03.105	3	19401	head	1.5jir	Gedo
19802	GOAT	Suuqa xoolaha Livestock Market	61.00	2026-06-11 14:48:00	79	2026-06-11 14:48:00	1	\N	\N	\N	APPROVED	25	FIELD_SUGUNTO_SABEEN	2026-09-24 08:30:03.105	USD	\N	Sabeen	8	2026-09-24 08:30:03.105	3	19401	head	1.5jir	Gedo
19803	GOAT	Suuqa xoolaha Livestock Market	108.00	2026-06-12 20:36:16.744	79	2026-06-12 20:36:16.744	1	\N	\N	\N	APPROVED	25	FIELD_BIRIMO_SABEEN	2026-09-24 08:30:03.105	USD	\N	Sabeen	8	2026-09-24 08:30:03.105	3	19401	head	2jir	Bay
19804	GOAT	Suuqa xoolaha Livestock Market	58.00	2026-06-14 02:24:33.488	79	2026-06-14 02:24:33.488	1	\N	\N	\N	APPROVED	25	FIELD_SUGUNTO_SABEEN	2026-09-24 08:30:03.105	USD	\N	Sabeen	8	2026-09-24 08:30:03.105	3	19401	head	2jir	Bay
19805	GOAT	Suuqa xoolaha Livestock Market	118.00	2026-06-15 08:12:50.233	79	2026-06-15 08:12:50.233	1	\N	\N	\N	APPROVED	25	FIELD_BIRIMO_SABEEN	2026-09-24 08:30:03.105	USD	\N	Sabeen	8	2026-09-24 08:30:03.105	3	19401	head	3jir	Bakool
19806	GOAT	Suuqa xoolaha Livestock Market	68.00	2026-06-16 14:01:06.977	79	2026-06-16 14:01:06.977	1	\N	\N	\N	APPROVED	25	FIELD_SUGUNTO_SABEEN	2026-09-24 08:30:03.105	USD	\N	Sabeen	8	2026-09-24 08:30:03.105	3	19401	head	3jir	Bakool
19807	GOAT	Suuqa xoolaha Livestock Market	93.00	2026-06-17 19:49:23.721	79	2026-06-17 19:49:23.721	1	\N	\N	\N	APPROVED	25	FIELD_BIRIMO_SABEEN	2026-09-24 08:30:03.105	USD	\N	Sabeen	8	2026-09-24 08:30:03.105	3	19401	head	1jir	Hiiraan
19808	GOAT	Suuqa xoolaha Livestock Market	43.00	2026-06-19 01:37:40.465	79	2026-06-19 01:37:40.465	1	\N	\N	\N	APPROVED	25	FIELD_SUGUNTO_SABEEN	2026-09-24 08:30:03.105	USD	\N	Sabeen	8	2026-09-24 08:30:03.105	3	19401	head	1jir	Hiiraan
19809	GOAT	Suuqa xoolaha Livestock Market	116.00	2026-06-20 07:25:57.209	79	2026-06-20 07:25:57.209	1	\N	\N	\N	APPROVED	25	FIELD_BIRIMO_SUMAL	2026-09-24 08:30:03.105	USD	\N	Sumal	8	2026-09-24 08:30:03.105	3	19406	head	1.5jir	Gedo
19810	GOAT	Suuqa xoolaha Livestock Market	66.00	2026-06-21 13:14:13.953	79	2026-06-21 13:14:13.953	1	\N	\N	\N	APPROVED	25	FIELD_SUGUNTO_SUMAL	2026-09-24 08:30:03.105	USD	\N	Sumal	8	2026-09-24 08:30:03.105	3	19406	head	1.5jir	Gedo
19811	GOAT	Suuqa xoolaha Livestock Market	113.00	2026-06-22 19:02:30.698	79	2026-06-22 19:02:30.698	1	\N	\N	\N	APPROVED	25	FIELD_BIRIMO_SUMAL	2026-09-24 08:30:03.105	USD	\N	Sumal	8	2026-09-24 08:30:03.105	3	19406	head	2jir	Bay
19812	GOAT	Suuqa xoolaha Livestock Market	63.00	2026-06-24 00:50:47.442	79	2026-06-24 00:50:47.442	1	\N	\N	\N	APPROVED	25	FIELD_SUGUNTO_SUMAL	2026-09-24 08:30:03.105	USD	\N	Sumal	8	2026-09-24 08:30:03.105	3	19406	head	2jir	Bay
19813	GOAT	Suuqa xoolaha Livestock Market	123.00	2026-06-25 06:39:04.186	79	2026-06-25 06:39:04.186	1	\N	\N	\N	APPROVED	25	FIELD_BIRIMO_SUMAL	2026-09-24 08:30:03.105	USD	\N	Sumal	8	2026-09-24 08:30:03.105	3	19406	head	3jir	Bakool
19814	GOAT	Suuqa xoolaha Livestock Market	73.00	2026-06-26 12:27:20.93	79	2026-06-26 12:27:20.93	1	\N	\N	\N	APPROVED	25	FIELD_SUGUNTO_SUMAL	2026-09-24 08:30:03.105	USD	\N	Sumal	8	2026-09-24 08:30:03.105	3	19406	head	3jir	Bakool
19815	GOAT	Suuqa xoolaha Livestock Market	98.00	2026-06-27 18:15:37.674	79	2026-06-27 18:15:37.674	1	\N	\N	\N	APPROVED	25	FIELD_BIRIMO_SUMAL	2026-09-24 08:30:03.105	USD	\N	Sumal	8	2026-09-24 08:30:03.105	3	19406	head	1jir	Hiiraan
19816	GOAT	Suuqa xoolaha Livestock Market	48.00	2026-06-29 00:03:54.419	79	2026-06-29 00:03:54.419	1	\N	\N	\N	APPROVED	25	FIELD_SUGUNTO_SUMAL	2026-09-24 08:30:03.105	USD	\N	Sumal	8	2026-09-24 08:30:03.105	3	19406	head	1jir	Hiiraan
19817	GOAT	Dayax Livestock Market	108.00	2026-06-30 05:52:11.163	80	2026-06-30 05:52:11.163	1	\N	\N	\N	APPROVED	26	FIELD_BIRIMO_LAX	2026-09-24 08:30:03.105	USD	\N	Lax	9	2026-09-24 08:30:03.105	3	2882	head	2jir	Gedo
19818	GOAT	Dayax Livestock Market	58.00	2026-07-01 11:40:27.907	80	2026-07-01 11:40:27.907	1	\N	\N	\N	APPROVED	26	FIELD_SUGUNTO_LAX	2026-09-24 08:30:03.105	USD	\N	Lax	9	2026-09-24 08:30:03.105	3	2882	head	2jir	Gedo
19819	GOAT	Dayax Livestock Market	105.00	2026-07-02 17:28:44.651	80	2026-07-02 17:28:44.651	1	\N	\N	\N	APPROVED	26	FIELD_BIRIMO_LAX	2026-09-24 08:30:03.105	USD	\N	Lax	9	2026-09-24 08:30:03.105	3	2882	head	3jir	Bay
19820	GOAT	Dayax Livestock Market	55.00	2026-07-03 23:17:01.395	80	2026-07-03 23:17:01.395	1	\N	\N	\N	APPROVED	26	FIELD_SUGUNTO_LAX	2026-09-24 08:30:03.105	USD	\N	Lax	9	2026-09-24 08:30:03.105	3	2882	head	3jir	Bay
19821	GOAT	Dayax Livestock Market	94.00	2026-07-05 05:05:18.14	80	2026-07-05 05:05:18.14	1	\N	\N	\N	APPROVED	26	FIELD_BIRIMO_LAX	2026-09-24 08:30:03.105	USD	\N	Lax	9	2026-09-24 08:30:03.105	3	2882	head	1jir	Bakool
19822	GOAT	Dayax Livestock Market	44.00	2026-07-06 10:53:34.884	80	2026-07-06 10:53:34.884	1	\N	\N	\N	APPROVED	26	FIELD_SUGUNTO_LAX	2026-09-24 08:30:03.105	USD	\N	Lax	9	2026-09-24 08:30:03.105	3	2882	head	1jir	Bakool
19823	GOAT	Dayax Livestock Market	91.00	2026-07-07 16:41:51.628	80	2026-07-07 16:41:51.628	1	\N	\N	\N	APPROVED	26	FIELD_BIRIMO_LAX	2026-09-24 08:30:03.105	USD	\N	Lax	9	2026-09-24 08:30:03.105	3	2882	head	1.5jir	Hiiraan
19824	GOAT	Dayax Livestock Market	41.00	2026-07-08 22:30:08.372	80	2026-07-08 22:30:08.372	1	\N	\N	\N	APPROVED	26	FIELD_SUGUNTO_LAX	2026-09-24 08:30:03.105	USD	\N	Lax	9	2026-09-24 08:30:03.105	3	2882	head	1.5jir	Hiiraan
19825	GOAT	Dayax Livestock Market	133.00	2026-07-10 04:18:25.116	80	2026-07-10 04:18:25.116	1	\N	\N	\N	APPROVED	26	FIELD_BIRIMO_WAN	2026-09-24 08:30:03.105	USD	\N	Wan	9	2026-09-24 08:30:03.105	3	2885	head	2jir	Gedo
19826	GOAT	Dayax Livestock Market	83.00	2026-07-11 10:06:41.86	80	2026-07-11 10:06:41.86	1	\N	\N	\N	APPROVED	26	FIELD_SUGUNTO_WAN	2026-09-24 08:30:03.105	USD	\N	Wan	9	2026-09-24 08:30:03.105	3	2885	head	2jir	Gedo
19827	GOAT	Dayax Livestock Market	130.00	2026-07-12 15:54:58.605	80	2026-07-12 15:54:58.605	1	\N	\N	\N	APPROVED	26	FIELD_BIRIMO_WAN	2026-09-24 08:30:03.105	USD	\N	Wan	9	2026-09-24 08:30:03.105	3	2885	head	3jir	Bay
19828	GOAT	Dayax Livestock Market	80.00	2026-07-13 21:43:15.349	80	2026-07-13 21:43:15.349	1	\N	\N	\N	APPROVED	26	FIELD_SUGUNTO_WAN	2026-09-24 08:30:03.105	USD	\N	Wan	9	2026-09-24 08:30:03.105	3	2885	head	3jir	Bay
19829	GOAT	Dayax Livestock Market	119.00	2026-07-15 03:31:32.093	80	2026-07-15 03:31:32.093	1	\N	\N	\N	APPROVED	26	FIELD_BIRIMO_WAN	2026-09-24 08:30:03.105	USD	\N	Wan	9	2026-09-24 08:30:03.105	3	2885	head	1jir	Bakool
19830	GOAT	Dayax Livestock Market	69.00	2026-07-16 09:19:48.837	80	2026-07-16 09:19:48.837	1	\N	\N	\N	APPROVED	26	FIELD_SUGUNTO_WAN	2026-09-24 08:30:03.105	USD	\N	Wan	9	2026-09-24 08:30:03.105	3	2885	head	1jir	Bakool
19831	GOAT	Dayax Livestock Market	116.00	2026-07-17 15:08:05.581	80	2026-07-17 15:08:05.581	1	\N	\N	\N	APPROVED	26	FIELD_BIRIMO_WAN	2026-09-24 08:30:03.105	USD	\N	Wan	9	2026-09-24 08:30:03.105	3	2885	head	1.5jir	Hiiraan
19832	GOAT	Dayax Livestock Market	66.00	2026-07-18 20:56:22.326	80	2026-07-18 20:56:22.326	1	\N	\N	\N	APPROVED	26	FIELD_SUGUNTO_WAN	2026-09-24 08:30:03.105	USD	\N	Wan	9	2026-09-24 08:30:03.105	3	2885	head	1.5jir	Hiiraan
19833	GOAT	Dayax Livestock Market	118.00	2026-07-20 02:44:39.07	80	2026-07-20 02:44:39.07	1	\N	\N	\N	APPROVED	26	FIELD_BIRIMO_CAYSAN	2026-09-24 08:30:03.105	USD	\N	Caysan	9	2026-09-24 08:30:03.105	3	2887	head	2jir	Gedo
19834	GOAT	Dayax Livestock Market	68.00	2026-07-21 08:32:55.814	80	2026-07-21 08:32:55.814	1	\N	\N	\N	APPROVED	26	FIELD_SUGUNTO_CAYSAN	2026-09-24 08:30:03.105	USD	\N	Caysan	9	2026-09-24 08:30:03.105	3	2887	head	2jir	Gedo
19835	GOAT	Dayax Livestock Market	115.00	2026-07-22 14:21:12.558	80	2026-07-22 14:21:12.558	1	\N	\N	\N	APPROVED	26	FIELD_BIRIMO_CAYSAN	2026-09-24 08:30:03.105	USD	\N	Caysan	9	2026-09-24 08:30:03.105	3	2887	head	3jir	Bay
19836	GOAT	Dayax Livestock Market	65.00	2026-07-23 20:09:29.302	80	2026-07-23 20:09:29.302	1	\N	\N	\N	APPROVED	26	FIELD_SUGUNTO_CAYSAN	2026-09-24 08:30:03.105	USD	\N	Caysan	9	2026-09-24 08:30:03.105	3	2887	head	3jir	Bay
19837	GOAT	Dayax Livestock Market	104.00	2026-07-25 01:57:46.047	80	2026-07-25 01:57:46.047	1	\N	\N	\N	APPROVED	26	FIELD_BIRIMO_CAYSAN	2026-09-24 08:30:03.105	USD	\N	Caysan	9	2026-09-24 08:30:03.105	3	2887	head	1jir	Bakool
19838	GOAT	Dayax Livestock Market	54.00	2026-07-26 07:46:02.791	80	2026-07-26 07:46:02.791	1	\N	\N	\N	APPROVED	26	FIELD_SUGUNTO_CAYSAN	2026-09-24 08:30:03.105	USD	\N	Caysan	9	2026-09-24 08:30:03.105	3	2887	head	1jir	Bakool
19839	GOAT	Dayax Livestock Market	101.00	2026-07-27 13:34:19.535	80	2026-07-27 13:34:19.535	1	\N	\N	\N	APPROVED	26	FIELD_BIRIMO_CAYSAN	2026-09-24 08:30:03.105	USD	\N	Caysan	9	2026-09-24 08:30:03.105	3	2887	head	1.5jir	Hiiraan
19840	GOAT	Dayax Livestock Market	51.00	2026-07-28 19:22:36.279	80	2026-07-28 19:22:36.279	1	\N	\N	\N	APPROVED	26	FIELD_SUGUNTO_CAYSAN	2026-09-24 08:30:03.105	USD	\N	Caysan	9	2026-09-24 08:30:03.105	3	2887	head	1.5jir	Hiiraan
19841	GOAT	Dayax Livestock Market	143.00	2026-07-30 01:10:53.023	80	2026-07-30 01:10:53.023	1	\N	\N	\N	APPROVED	26	FIELD_BIRIMO_ORGI	2026-09-24 08:30:03.105	USD	\N	Orgi	9	2026-09-24 08:30:03.105	3	2890	head	2jir	Gedo
19842	GOAT	Dayax Livestock Market	93.00	2026-07-31 06:59:09.767	80	2026-07-31 06:59:09.767	1	\N	\N	\N	APPROVED	26	FIELD_SUGUNTO_ORGI	2026-09-24 08:30:03.105	USD	\N	Orgi	9	2026-09-24 08:30:03.105	3	2890	head	2jir	Gedo
19843	GOAT	Dayax Livestock Market	140.00	2026-08-01 12:47:26.512	80	2026-08-01 12:47:26.512	1	\N	\N	\N	APPROVED	26	FIELD_BIRIMO_ORGI	2026-09-24 08:30:03.105	USD	\N	Orgi	9	2026-09-24 08:30:03.105	3	2890	head	3jir	Bay
19844	GOAT	Dayax Livestock Market	90.00	2026-08-02 18:35:43.256	80	2026-08-02 18:35:43.256	1	\N	\N	\N	APPROVED	26	FIELD_SUGUNTO_ORGI	2026-09-24 08:30:03.105	USD	\N	Orgi	9	2026-09-24 08:30:03.105	3	2890	head	3jir	Bay
19845	GOAT	Dayax Livestock Market	129.00	2026-08-04 00:24:00	80	2026-08-04 00:24:00	1	\N	\N	\N	APPROVED	26	FIELD_BIRIMO_ORGI	2026-09-24 08:30:03.105	USD	\N	Orgi	9	2026-09-24 08:30:03.105	3	2890	head	1jir	Bakool
19846	GOAT	Dayax Livestock Market	79.00	2026-08-05 06:12:16.744	80	2026-08-05 06:12:16.744	1	\N	\N	\N	APPROVED	26	FIELD_SUGUNTO_ORGI	2026-09-24 08:30:03.105	USD	\N	Orgi	9	2026-09-24 08:30:03.105	3	2890	head	1jir	Bakool
19847	GOAT	Dayax Livestock Market	126.00	2026-08-06 12:00:33.488	80	2026-08-06 12:00:33.488	1	\N	\N	\N	APPROVED	26	FIELD_BIRIMO_ORGI	2026-09-24 08:30:03.105	USD	\N	Orgi	9	2026-09-24 08:30:03.105	3	2890	head	1.5jir	Hiiraan
19848	GOAT	Dayax Livestock Market	76.00	2026-08-07 17:48:50.233	80	2026-08-07 17:48:50.233	1	\N	\N	\N	APPROVED	26	FIELD_SUGUNTO_ORGI	2026-09-24 08:30:03.105	USD	\N	Orgi	9	2026-09-24 08:30:03.105	3	2890	head	1.5jir	Hiiraan
19849	GOAT	Dayax Livestock Market	113.00	2026-08-08 23:37:06.977	80	2026-08-08 23:37:06.977	1	\N	\N	\N	APPROVED	26	FIELD_BIRIMO_NEYL	2026-09-24 08:30:03.105	USD	\N	Neyl	9	2026-09-24 08:30:03.105	3	2893	head	2jir	Gedo
19850	GOAT	Dayax Livestock Market	63.00	2026-08-10 05:25:23.721	80	2026-08-10 05:25:23.721	1	\N	\N	\N	APPROVED	26	FIELD_SUGUNTO_NEYL	2026-09-24 08:30:03.105	USD	\N	Neyl	9	2026-09-24 08:30:03.105	3	2893	head	2jir	Gedo
19851	GOAT	Dayax Livestock Market	110.00	2026-08-11 11:13:40.465	80	2026-08-11 11:13:40.465	1	\N	\N	\N	APPROVED	26	FIELD_BIRIMO_NEYL	2026-09-24 08:30:03.105	USD	\N	Neyl	9	2026-09-24 08:30:03.105	3	2893	head	3jir	Bay
19852	GOAT	Dayax Livestock Market	60.00	2026-08-12 17:01:57.209	80	2026-08-12 17:01:57.209	1	\N	\N	\N	APPROVED	26	FIELD_SUGUNTO_NEYL	2026-09-24 08:30:03.105	USD	\N	Neyl	9	2026-09-24 08:30:03.105	3	2893	head	3jir	Bay
19853	GOAT	Dayax Livestock Market	99.00	2026-08-13 22:50:13.953	80	2026-08-13 22:50:13.953	1	\N	\N	\N	APPROVED	26	FIELD_BIRIMO_NEYL	2026-09-24 08:30:03.105	USD	\N	Neyl	9	2026-09-24 08:30:03.105	3	2893	head	1jir	Bakool
19854	GOAT	Dayax Livestock Market	49.00	2026-08-15 04:38:30.698	80	2026-08-15 04:38:30.698	1	\N	\N	\N	APPROVED	26	FIELD_SUGUNTO_NEYL	2026-09-24 08:30:03.105	USD	\N	Neyl	9	2026-09-24 08:30:03.105	3	2893	head	1jir	Bakool
19855	GOAT	Dayax Livestock Market	96.00	2026-08-16 10:26:47.442	80	2026-08-16 10:26:47.442	1	\N	\N	\N	APPROVED	26	FIELD_BIRIMO_NEYL	2026-09-24 08:30:03.105	USD	\N	Neyl	9	2026-09-24 08:30:03.105	3	2893	head	1.5jir	Hiiraan
19856	GOAT	Dayax Livestock Market	46.00	2026-08-17 16:15:04.186	80	2026-08-17 16:15:04.186	1	\N	\N	\N	APPROVED	26	FIELD_SUGUNTO_NEYL	2026-09-24 08:30:03.105	USD	\N	Neyl	9	2026-09-24 08:30:03.105	3	2893	head	1.5jir	Hiiraan
19857	GOAT	Dayax Livestock Market	125.00	2026-08-18 22:03:20.93	80	2026-08-18 22:03:20.93	1	\N	\N	\N	APPROVED	26	FIELD_BIRIMO_RI	2026-09-24 08:30:03.105	USD	\N	Ri	9	2026-09-24 08:30:03.105	3	13	head	2jir	Gedo
19858	GOAT	Dayax Livestock Market	75.00	2026-08-20 03:51:37.674	80	2026-08-20 03:51:37.674	1	\N	\N	\N	APPROVED	26	FIELD_SUGUNTO_RI	2026-09-24 08:30:03.105	USD	\N	Ri	9	2026-09-24 08:30:03.105	3	13	head	2jir	Gedo
19859	GOAT	Dayax Livestock Market	122.00	2026-08-21 09:39:54.419	80	2026-08-21 09:39:54.419	1	\N	\N	\N	APPROVED	26	FIELD_BIRIMO_RI	2026-09-24 08:30:03.105	USD	\N	Ri	9	2026-09-24 08:30:03.105	3	13	head	3jir	Bay
19860	GOAT	Dayax Livestock Market	72.00	2026-08-22 15:28:11.163	80	2026-08-22 15:28:11.163	1	\N	\N	\N	APPROVED	26	FIELD_SUGUNTO_RI	2026-09-24 08:30:03.105	USD	\N	Ri	9	2026-09-24 08:30:03.105	3	13	head	3jir	Bay
19861	GOAT	Dayax Livestock Market	111.00	2026-08-23 21:16:27.907	80	2026-08-23 21:16:27.907	1	\N	\N	\N	APPROVED	26	FIELD_BIRIMO_RI	2026-09-24 08:30:03.105	USD	\N	Ri	9	2026-09-24 08:30:03.105	3	13	head	1jir	Bakool
19862	GOAT	Dayax Livestock Market	61.00	2026-08-25 03:04:44.651	80	2026-08-25 03:04:44.651	1	\N	\N	\N	APPROVED	26	FIELD_SUGUNTO_RI	2026-09-24 08:30:03.105	USD	\N	Ri	9	2026-09-24 08:30:03.105	3	13	head	1jir	Bakool
19863	GOAT	Dayax Livestock Market	108.00	2026-08-26 08:53:01.395	80	2026-08-26 08:53:01.395	1	\N	\N	\N	APPROVED	26	FIELD_BIRIMO_RI	2026-09-24 08:30:03.105	USD	\N	Ri	9	2026-09-24 08:30:03.105	3	13	head	1.5jir	Hiiraan
19864	GOAT	Dayax Livestock Market	58.00	2026-08-27 14:41:18.14	80	2026-08-27 14:41:18.14	1	\N	\N	\N	APPROVED	26	FIELD_SUGUNTO_RI	2026-09-24 08:30:03.105	USD	\N	Ri	9	2026-09-24 08:30:03.105	3	13	head	1.5jir	Hiiraan
19865	GOAT	Dayax Livestock Market	98.00	2026-08-28 20:29:34.884	80	2026-08-28 20:29:34.884	1	\N	\N	\N	APPROVED	26	FIELD_BIRIMO_WAXAR	2026-09-24 08:30:03.105	USD	\N	Waxar	9	2026-09-24 08:30:03.105	3	19391	head	2jir	Gedo
19866	GOAT	Dayax Livestock Market	48.00	2026-08-30 02:17:51.628	80	2026-08-30 02:17:51.628	1	\N	\N	\N	APPROVED	26	FIELD_SUGUNTO_WAXAR	2026-09-24 08:30:03.105	USD	\N	Waxar	9	2026-09-24 08:30:03.105	3	19391	head	2jir	Gedo
19867	GOAT	Dayax Livestock Market	95.00	2026-08-31 08:06:08.372	80	2026-08-31 08:06:08.372	1	\N	\N	\N	APPROVED	26	FIELD_BIRIMO_WAXAR	2026-09-24 08:30:03.105	USD	\N	Waxar	9	2026-09-24 08:30:03.105	3	19391	head	3jir	Bay
19868	GOAT	Dayax Livestock Market	45.00	2026-09-01 13:54:25.116	80	2026-09-01 13:54:25.116	1	\N	\N	\N	APPROVED	26	FIELD_SUGUNTO_WAXAR	2026-09-24 08:30:03.105	USD	\N	Waxar	9	2026-09-24 08:30:03.105	3	19391	head	3jir	Bay
19869	GOAT	Dayax Livestock Market	84.00	2026-09-02 19:42:41.86	80	2026-09-02 19:42:41.86	1	\N	\N	\N	APPROVED	26	FIELD_BIRIMO_WAXAR	2026-09-24 08:30:03.105	USD	\N	Waxar	9	2026-09-24 08:30:03.105	3	19391	head	1jir	Bakool
19870	GOAT	Dayax Livestock Market	34.00	2026-09-04 01:30:58.605	80	2026-09-04 01:30:58.605	1	\N	\N	\N	APPROVED	26	FIELD_SUGUNTO_WAXAR	2026-09-24 08:30:03.105	USD	\N	Waxar	9	2026-09-24 08:30:03.105	3	19391	head	1jir	Bakool
19871	GOAT	Dayax Livestock Market	81.00	2026-09-05 07:19:15.349	80	2026-09-05 07:19:15.349	1	\N	\N	\N	APPROVED	26	FIELD_BIRIMO_WAXAR	2026-09-24 08:30:03.105	USD	\N	Waxar	9	2026-09-24 08:30:03.105	3	19391	head	1.5jir	Hiiraan
19872	GOAT	Dayax Livestock Market	31.00	2026-09-06 13:07:32.093	80	2026-09-06 13:07:32.093	1	\N	\N	\N	APPROVED	26	FIELD_SUGUNTO_WAXAR	2026-09-24 08:30:03.105	USD	\N	Waxar	9	2026-09-24 08:30:03.105	3	19391	head	1.5jir	Hiiraan
19873	GOAT	Dayax Livestock Market	103.00	2026-09-07 18:55:48.837	80	2026-09-07 18:55:48.837	1	\N	\N	\N	APPROVED	26	FIELD_BIRIMO_SABEEN	2026-09-24 08:30:03.169	USD	\N	Sabeen	9	2026-09-24 08:30:03.169	3	19401	head	2jir	Gedo
19874	GOAT	Dayax Livestock Market	53.00	2026-09-09 00:44:05.581	80	2026-09-09 00:44:05.581	1	\N	\N	\N	APPROVED	26	FIELD_SUGUNTO_SABEEN	2026-09-24 08:30:03.169	USD	\N	Sabeen	9	2026-09-24 08:30:03.169	3	19401	head	2jir	Gedo
19875	GOAT	Dayax Livestock Market	100.00	2026-09-10 06:32:22.326	80	2026-09-10 06:32:22.326	1	\N	\N	\N	APPROVED	26	FIELD_BIRIMO_SABEEN	2026-09-24 08:30:03.169	USD	\N	Sabeen	9	2026-09-24 08:30:03.169	3	19401	head	3jir	Bay
19876	GOAT	Dayax Livestock Market	50.00	2026-09-11 12:20:39.07	80	2026-09-11 12:20:39.07	1	\N	\N	\N	APPROVED	26	FIELD_SUGUNTO_SABEEN	2026-09-24 08:30:03.169	USD	\N	Sabeen	9	2026-09-24 08:30:03.169	3	19401	head	3jir	Bay
19877	GOAT	Dayax Livestock Market	89.00	2026-09-12 18:08:55.814	80	2026-09-12 18:08:55.814	1	\N	\N	\N	APPROVED	26	FIELD_BIRIMO_SABEEN	2026-09-24 08:30:03.169	USD	\N	Sabeen	9	2026-09-24 08:30:03.169	3	19401	head	1jir	Bakool
19878	GOAT	Dayax Livestock Market	39.00	2026-09-13 23:57:12.558	80	2026-09-13 23:57:12.558	1	\N	\N	\N	APPROVED	26	FIELD_SUGUNTO_SABEEN	2026-09-24 08:30:03.169	USD	\N	Sabeen	9	2026-09-24 08:30:03.169	3	19401	head	1jir	Bakool
19879	GOAT	Dayax Livestock Market	86.00	2026-09-15 05:45:29.302	80	2026-09-15 05:45:29.302	1	\N	\N	\N	APPROVED	26	FIELD_BIRIMO_SABEEN	2026-09-24 08:30:03.169	USD	\N	Sabeen	9	2026-09-24 08:30:03.169	3	19401	head	1.5jir	Hiiraan
19880	GOAT	Dayax Livestock Market	36.00	2026-09-16 11:33:46.047	80	2026-09-16 11:33:46.047	1	\N	\N	\N	APPROVED	26	FIELD_SUGUNTO_SABEEN	2026-09-24 08:30:03.169	USD	\N	Sabeen	9	2026-09-24 08:30:03.169	3	19401	head	1.5jir	Hiiraan
19881	GOAT	Dayax Livestock Market	108.00	2026-09-17 17:22:02.791	80	2026-09-17 17:22:02.791	1	\N	\N	\N	APPROVED	26	FIELD_BIRIMO_SUMAL	2026-09-24 08:30:03.169	USD	\N	Sumal	9	2026-09-24 08:30:03.169	3	19406	head	2jir	Gedo
19882	GOAT	Dayax Livestock Market	58.00	2026-09-18 23:10:19.535	80	2026-09-18 23:10:19.535	1	\N	\N	\N	APPROVED	26	FIELD_SUGUNTO_SUMAL	2026-09-24 08:30:03.169	USD	\N	Sumal	9	2026-09-24 08:30:03.169	3	19406	head	2jir	Gedo
19883	GOAT	Dayax Livestock Market	105.00	2026-09-20 04:58:36.279	80	2026-09-20 04:58:36.279	1	\N	\N	\N	APPROVED	26	FIELD_BIRIMO_SUMAL	2026-09-24 08:30:03.169	USD	\N	Sumal	9	2026-09-24 08:30:03.169	3	19406	head	3jir	Bay
19884	GOAT	Dayax Livestock Market	55.00	2026-09-21 10:46:53.023	80	2026-09-21 10:46:53.023	1	\N	\N	\N	APPROVED	26	FIELD_SUGUNTO_SUMAL	2026-09-24 08:30:03.169	USD	\N	Sumal	9	2026-09-24 08:30:03.169	3	19406	head	3jir	Bay
19885	GOAT	Dayax Livestock Market	94.00	2026-09-22 16:35:09.767	80	2026-09-22 16:35:09.767	1	\N	\N	\N	APPROVED	26	FIELD_BIRIMO_SUMAL	2026-09-24 08:30:03.169	USD	\N	Sumal	9	2026-09-24 08:30:03.169	3	19406	head	1jir	Bakool
19886	GOAT	Dayax Livestock Market	44.00	2026-09-23 22:23:26.512	80	2026-09-23 22:23:26.512	1	\N	\N	\N	APPROVED	26	FIELD_SUGUNTO_SUMAL	2026-09-24 08:30:03.169	USD	\N	Sumal	9	2026-09-24 08:30:03.169	3	19406	head	1jir	Bakool
19887	GOAT	Dayax Livestock Market	91.00	2026-09-25 04:11:43.256	80	2026-09-25 04:11:43.256	1	\N	\N	\N	APPROVED	26	FIELD_BIRIMO_SUMAL	2026-09-24 08:30:03.169	USD	\N	Sumal	9	2026-09-24 08:30:03.169	3	19406	head	1.5jir	Hiiraan
19888	GOAT	Dayax Livestock Market	41.00	2026-09-26 10:00:00	80	2026-09-26 10:00:00	1	\N	\N	\N	APPROVED	26	FIELD_SUGUNTO_SUMAL	2026-09-24 08:30:03.169	USD	\N	Sumal	9	2026-09-24 08:30:03.169	3	19406	head	1.5jir	Hiiraan
\.


--
-- Data for Name: market_prices; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.market_prices (id, company_id, market_id, section_id, product_service, price, currency, unit, kilowatt, meter_cubic, effective_date, description, status, rejection_reason, updated_by, approved_by, approved_at, rejected_by, rejected_at, deleted_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: market_sections; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.market_sections (id, market_id, name, description, status, deleted_at, created_at, updated_at) FROM stdin;
5	2	Commercial	\N	ACTIVE	\N	2026-08-10 07:32:22.774	2026-09-05 13:17:27.904
4	2	Residential	\N	ACTIVE	\N	2026-08-10 07:32:22.769	2026-09-05 13:17:28.087
2	1	Commercial	\N	ACTIVE	\N	2026-08-10 07:32:22.759	2026-09-05 13:17:28.13
1	1	Household	\N	ACTIVE	\N	2026-08-10 07:32:22.741	2026-09-05 13:17:28.185
6	2	Unit kWh	\N	ACTIVE	\N	2026-08-10 07:32:22.781	2026-09-05 13:38:39.014
\.


--
-- Data for Name: markets; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.markets (id, name, location, market_type, description, status, deleted_at, created_at, updated_at, code, logo_file_name) FROM stdin;
1	Water Supply Market	Mogadishu	WATER	Municipal and private water supply market	ACTIVE	\N	2026-08-10 07:32:22.702	2026-08-15 21:15:11.189	\N	\N
8	Suuqa xoolaha Livestock Market	Suuqa Xoolaha, Mogadishu	LIVESTOCK	\N	ACTIVE	\N	2026-08-19 13:28:15.16	2026-08-19 13:28:15.16	MKT-0008	\N
6	Deniile livestock market	Dayniile, Mogadishu	LIVESTOCK	\N	ACTIVE	\N	2026-08-19 13:28:15.135	2026-08-23 11:03:56.895	MKT-0006	\N
7	Sinka dheer Livestock Market	Sinka Dheer, Mogadishu	LIVESTOCK	\N	ACTIVE	\N	2026-08-19 13:28:15.152	2026-08-23 11:03:56.911	MKT-0007	\N
10	Medina Livestock Market	Medina, Mogadishu	LIVESTOCK	\N	ACTIVE	\N	2026-08-19 13:28:15.178	2026-08-23 11:03:56.92	MKT-0010	\N
9	Dayax Livestock Market	Dayax, Mogadishu	LIVESTOCK		ACTIVE	\N	2026-08-19 13:28:15.169	2026-09-09 17:41:15.144	MKT-0009	\N
2	Electricity Market	Mogadishu	ELECTRICITY	Electricity providers market	ACTIVE	\N	2026-08-10 07:32:22.724	2026-09-22 18:36:43.707	\N	\N
27	suuqa caanaha	\N	LIVESTOCK	\N	INACTIVE	2026-09-23 07:57:33.332	2026-09-23 07:56:46.81	2026-09-23 07:57:33.334	MKT-0027	\N
28	suqa caanaha	\N	LIVESTOCK	\N	INACTIVE	2026-09-24 10:47:04.558	2026-09-24 10:46:45.323	2026-09-24 10:47:04.56	MKT-0028	\N
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notifications (id, user_id, title, message, sector, read, created_at, sender_id, type) FROM stdin;
485	6	Subscription cancelled	Your Basic Annual subscription was cancelled.	subscription	f	2026-09-07 20:59:46.158+03	\N	GENERAL
620	76	Registration received	We received your MMPS application. An admin will review your documents. You will get a notification here if a file needs to be updated.	account	f	2026-09-08 23:15:53.343+03	\N	GENERAL
622	76	Application approved	Your MMPS registration was approved. You can now open the Livestock Broker portal.	account	f	2026-09-08 23:16:23.786+03	\N	GENERAL
627	76	Livestock price approved	Awr waa la aqbalay oo public ayaa laga arki karaa.	livestock	f	2026-09-08 23:17:40.537+03	1	PRICE_APPROVED
628	76	Livestock price approved	Awr waa la aqbalay oo public ayaa laga arki karaa.	livestock	f	2026-09-08 23:17:41.468+03	1	PRICE_APPROVED
630	76	Livestock price approved	Awr waa la aqbalay oo public ayaa laga arki karaa.	livestock	f	2026-09-08 23:19:30.651+03	1	PRICE_APPROVED
633	76	Livestock price approved	Awr waa la aqbalay oo public ayaa laga arki karaa.	livestock	f	2026-09-08 23:24:21.721+03	1	PRICE_APPROVED
634	76	Livestock price approved	Hal waa la aqbalay oo public ayaa laga arki karaa.	livestock	f	2026-09-08 23:24:22.958+03	1	PRICE_APPROVED
639	76	Livestock price approved	Awr waa la aqbalay oo public ayaa laga arki karaa.	livestock	f	2026-09-08 23:28:29.503+03	1	PRICE_APPROVED
640	76	Livestock price approved	Awr waa la aqbalay oo public ayaa laga arki karaa.	livestock	f	2026-09-08 23:28:31.611+03	1	PRICE_APPROVED
642	76	Livestock price approved	Awr waa la aqbalay oo public ayaa laga arki karaa.	livestock	f	2026-09-08 23:32:03.706+03	1	PRICE_APPROVED
644	76	Livestock price approved	Hal waa la aqbalay oo public ayaa laga arki karaa.	livestock	f	2026-09-08 23:33:19.059+03	1	PRICE_APPROVED
651	76	Livestock price approved	Baarqab waa la aqbalay oo public ayaa laga arki karaa.	livestock	f	2026-09-09 09:45:09.900+03	1	PRICE_APPROVED
652	76	Livestock price approved	Baarqab waa la aqbalay oo public ayaa laga arki karaa.	livestock	f	2026-09-09 09:45:10.918+03	1	PRICE_APPROVED
653	76	Livestock price approved	Qalin waa la aqbalay oo public ayaa laga arki karaa.	livestock	f	2026-09-09 09:45:12.345+03	1	PRICE_APPROVED
654	76	Livestock price approved	Qalin waa la aqbalay oo public ayaa laga arki karaa.	livestock	f	2026-09-09 09:45:13.517+03	1	PRICE_APPROVED
655	76	Livestock price approved	Qurbac waa la aqbalay oo public ayaa laga arki karaa.	livestock	f	2026-09-09 09:45:14.660+03	1	PRICE_APPROVED
656	76	Livestock price approved	Qurbac waa la aqbalay oo public ayaa laga arki karaa.	livestock	f	2026-09-09 09:45:16.208+03	1	PRICE_APPROVED
660	76	Livestock price approved	Qalin waa la aqbalay oo public ayaa laga arki karaa.	livestock	f	2026-09-09 10:09:33.707+03	1	PRICE_APPROVED
661	76	Livestock price approved	Qurbac waa la aqbalay oo public ayaa laga arki karaa.	livestock	f	2026-09-09 10:09:35.075+03	1	PRICE_APPROVED
662	76	Livestock price approved	Baarqab waa la aqbalay oo public ayaa laga arki karaa.	livestock	f	2026-09-09 10:09:36.088+03	1	PRICE_APPROVED
666	76	Livestock price approved	Baarqab waa la aqbalay oo public ayaa laga arki karaa.	livestock	f	2026-09-09 10:16:13.059+03	1	PRICE_APPROVED
667	76	Livestock price approved	Qalin waa la aqbalay oo public ayaa laga arki karaa.	livestock	f	2026-09-09 10:16:14.650+03	1	PRICE_APPROVED
668	76	Livestock price approved	Baarqab waa la aqbalay oo public ayaa laga arki karaa.	livestock	f	2026-09-09 10:16:15.465+03	1	PRICE_APPROVED
669	77	Registration received	We received your MMPS application. An admin will review your documents. You will get a notification here if a file needs to be updated.	account	f	2026-09-09 10:21:53.738+03	\N	GENERAL
671	77	Application approved	Your MMPS registration was approved. You can now open the Livestock Broker portal.	account	f	2026-09-09 10:22:09.015+03	\N	GENERAL
683	77	Livestock price approved	Qaalin waa la aqbalay oo public ayaa laga arki karaa.	livestock	f	2026-09-09 10:28:21.730+03	1	PRICE_APPROVED
684	77	Livestock price approved	Qaalin waa la aqbalay oo public ayaa laga arki karaa.	livestock	f	2026-09-09 10:28:22.770+03	1	PRICE_APPROVED
685	77	Livestock price approved	Weyl waa la aqbalay oo public ayaa laga arki karaa.	livestock	f	2026-09-09 10:28:23.671+03	1	PRICE_APPROVED
686	77	Livestock price approved	Weyl waa la aqbalay oo public ayaa laga arki karaa.	livestock	f	2026-09-09 10:28:24.381+03	1	PRICE_APPROVED
687	77	Livestock price approved	Dibi waa la aqbalay oo public ayaa laga arki karaa.	livestock	f	2026-09-09 10:28:26.522+03	1	PRICE_APPROVED
688	77	Livestock price approved	Sac waa la aqbalay oo public ayaa laga arki karaa.	livestock	f	2026-09-09 10:28:27.706+03	1	PRICE_APPROVED
689	77	Livestock price approved	Sac waa la aqbalay oo public ayaa laga arki karaa.	livestock	f	2026-09-09 10:28:28.622+03	1	PRICE_APPROVED
694	77	Livestock price approved	Qaalin waa la aqbalay oo public ayaa laga arki karaa.	livestock	f	2026-09-09 10:36:26.990+03	1	PRICE_APPROVED
695	77	Livestock price approved	Weyl waa la aqbalay oo public ayaa laga arki karaa.	livestock	f	2026-09-09 10:36:28.788+03	1	PRICE_APPROVED
696	77	Livestock price approved	Dibi waa la aqbalay oo public ayaa laga arki karaa.	livestock	f	2026-09-09 10:36:30.130+03	1	PRICE_APPROVED
697	77	Livestock price approved	Sac waa la aqbalay oo public ayaa laga arki karaa.	livestock	f	2026-09-09 10:36:30.983+03	1	PRICE_APPROVED
699	77	Livestock price approved	Sac waa la aqbalay oo public ayaa laga arki karaa.	livestock	f	2026-09-09 10:39:42.264+03	1	PRICE_APPROVED
723	79	Registration received	We received your MMPS application. An admin will review your documents. You will get a notification here if a file needs to be updated.	account	f	2026-09-09 15:58:33.798+03	\N	GENERAL
725	79	Application approved	Your MMPS registration was approved. You can now open the Livestock Broker portal.	account	f	2026-09-09 15:58:46.449+03	\N	GENERAL
727	80	Registration received	We received your MMPS application. An admin will review your documents. You will get a notification here if a file needs to be updated.	account	f	2026-09-09 17:07:56.448+03	\N	GENERAL
729	80	Application approved	Your MMPS registration was approved. You can now open the Livestock Broker portal.	account	f	2026-09-09 17:08:19.869+03	\N	GENERAL
764	80	Livestock price approved	Baarqab waa la aqbalay oo public ayaa laga arki karaa.	livestock	f	2026-09-10 19:49:42.592+03	1	PRICE_APPROVED
765	80	Livestock price approved	Qurbac waa la aqbalay oo public ayaa laga arki karaa.	livestock	f	2026-09-10 19:49:43.520+03	1	PRICE_APPROVED
766	80	Livestock price approved	Qalin waa la aqbalay oo public ayaa laga arki karaa.	livestock	f	2026-09-10 19:49:44.186+03	1	PRICE_APPROVED
767	80	Livestock price approved	Hal waa la aqbalay oo public ayaa laga arki karaa.	livestock	f	2026-09-10 19:49:44.887+03	1	PRICE_APPROVED
768	80	Livestock price approved	Awr waa la aqbalay oo public ayaa laga arki karaa.	livestock	f	2026-09-10 19:49:45.506+03	1	PRICE_APPROVED
774	80	Livestock price approved	Baarqab waa la aqbalay oo public ayaa laga arki karaa.	livestock	f	2026-09-10 19:57:52.982+03	1	PRICE_APPROVED
775	80	Livestock price approved	Qalin waa la aqbalay oo public ayaa laga arki karaa.	livestock	f	2026-09-10 19:57:54.545+03	1	PRICE_APPROVED
776	80	Livestock price approved	Qurbac waa la aqbalay oo public ayaa laga arki karaa.	livestock	f	2026-09-10 19:57:55.738+03	1	PRICE_APPROVED
777	80	Livestock price approved	Hal waa la aqbalay oo public ayaa laga arki karaa.	livestock	f	2026-09-10 19:57:56.773+03	1	PRICE_APPROVED
778	80	Livestock price approved	Awr waa la aqbalay oo public ayaa laga arki karaa.	livestock	f	2026-09-10 19:57:58.055+03	1	PRICE_APPROVED
780	80	Livestock price approved	Qalin waa la aqbalay oo public ayaa laga arki karaa.	livestock	f	2026-09-10 20:28:35.536+03	1	PRICE_APPROVED
781	6	Subscription activated	Your Basic Annual subscription is now active until 2027-08-10.	subscription	f	2026-09-10 22:42:24.340+03	\N	SUBSCRIPTION_ACTIVATED
782	6	Subscription cancelled	Your Basic Annual subscription was cancelled.	subscription	f	2026-09-10 22:42:33.710+03	\N	GENERAL
783	79	Subscription cancelled	Your Basic Annual subscription was cancelled.	subscription	f	2026-09-10 22:42:37.585+03	\N	GENERAL
789	79	Subscription activated	Your Basic Annual subscription is now active until 2027-09-09.	subscription	f	2026-09-11 14:38:09.335+03	\N	SUBSCRIPTION_ACTIVATED
791	6	Subscription activated	Your Basic Annual subscription is now active until 2027-08-10.	subscription	f	2026-09-11 14:38:44.229+03	\N	SUBSCRIPTION_ACTIVATED
794	6	Subscription activated	Your Basic Annual subscription is now active until 2027-09-09.	subscription	f	2026-09-11 14:43:40.481+03	\N	SUBSCRIPTION_ACTIVATED
795	6	Subscription activated	Your Basic Annual subscription is now active until 2027-10-09.	subscription	f	2026-09-11 14:43:46.506+03	\N	SUBSCRIPTION_ACTIVATED
796	6	Subscription activated	Your Basic Annual subscription is now active until 2027-11-08.	subscription	f	2026-09-11 14:43:48.081+03	\N	SUBSCRIPTION_ACTIVATED
797	76	Subscription activated	Your Basic Annual subscription is now active until 2027-10-08.	subscription	f	2026-09-11 15:01:11.382+03	\N	SUBSCRIPTION_ACTIVATED
798	76	Subscription cancelled	Your Basic Annual subscription was cancelled.	subscription	f	2026-09-11 15:01:16.592+03	\N	GENERAL
799	76	Subscription activated	Your Basic Annual subscription is now active until 2027-10-08.	subscription	f	2026-09-11 15:03:10.800+03	\N	SUBSCRIPTION_ACTIVATED
801	76	Livestock price approved	Awr waa la aqbalay oo public ayaa laga arki karaa.	livestock	f	2026-09-11 15:03:33.270+03	1	PRICE_APPROVED
824	6	Subscription activated	Your Basic Annual subscription is now active until 2027-12-08.	subscription	f	2026-09-17 09:02:11.161+03	\N	SUBSCRIPTION_ACTIVATED
825	6	Subscription activated	Your Basic Annual subscription is now active until 2028-01-07.	subscription	f	2026-09-17 09:02:12.407+03	\N	SUBSCRIPTION_ACTIVATED
826	6	Subscription activated	Your Basic Annual subscription is now active until 2028-02-06.	subscription	f	2026-09-17 09:02:14.387+03	\N	SUBSCRIPTION_ACTIVATED
827	6	Subscription activated	Your Basic Annual subscription is now active until 2028-03-07.	subscription	f	2026-09-17 09:02:15.294+03	\N	SUBSCRIPTION_ACTIVATED
852	78	Subscription cancelled	Your Livestock · 1 Year subscription was cancelled.	subscription	f	2026-09-22 13:58:22.486+03	\N	GENERAL
854	78	Subscription activated	Your Livestock · 1 Year subscription is now active until 2027-09-22.	subscription	f	2026-09-22 14:05:57.080+03	\N	SUBSCRIPTION_ACTIVATED
855	78	Subscription cancelled	Your Livestock · 1 Year subscription was cancelled.	subscription	f	2026-09-22 14:06:07.633+03	\N	GENERAL
856	78	Subscription activated	Your Livestock · 1 Year subscription is now active until 2027-09-22.	subscription	f	2026-09-22 14:21:47.407+03	\N	SUBSCRIPTION_ACTIVATED
928	76	Subscription expired	Your Livestock · Free subscription has expired.	subscription	f	2026-09-24 09:37:55.105+03	\N	SUBSCRIPTION_EXPIRED
930	77	Subscription expired	Your Livestock · Free subscription has expired.	subscription	f	2026-09-24 09:37:55.145+03	\N	SUBSCRIPTION_EXPIRED
932	78	Subscription expired	Your Livestock · Free subscription has expired.	subscription	f	2026-09-24 09:37:55.177+03	\N	SUBSCRIPTION_EXPIRED
934	79	Subscription expired	Your Livestock · 3 Months subscription has expired.	subscription	f	2026-09-24 09:37:55.203+03	\N	SUBSCRIPTION_EXPIRED
936	80	Subscription expired	Your Livestock · 6 Months subscription has expired.	subscription	f	2026-09-24 09:37:55.230+03	\N	SUBSCRIPTION_EXPIRED
938	81	Subscription expired	Your Livestock · 3 Months subscription has expired.	subscription	f	2026-09-24 09:37:55.263+03	\N	SUBSCRIPTION_EXPIRED
943	80	Subscription activated	Your Livestock · 6 Months subscription is now active until 2027-03-23.	subscription	f	2026-09-24 10:09:53.773+03	\N	SUBSCRIPTION_ACTIVATED
945	78	Subscription activated	Your Livestock · 1 Year subscription is now active until 2027-09-24.	subscription	f	2026-09-24 10:31:00.359+03	\N	SUBSCRIPTION_ACTIVATED
947	81	Subscription activated	Your Livestock · 3 Months subscription is now active until 2026-12-23.	subscription	f	2026-09-24 10:48:10.733+03	\N	SUBSCRIPTION_ACTIVATED
986	76	Subscription activated	Your Livestock · Free subscription is now active until 2026-10-25.	subscription	f	2026-09-25 05:32:54.648+03	\N	SUBSCRIPTION_ACTIVATED
987	76	Subscription activated	Your Livestock · Free subscription is now active until 2026-10-25.	subscription	f	2026-09-25 05:32:54.653+03	\N	SUBSCRIPTION_ACTIVATED
988	77	Subscription activated	Your Livestock · Free subscription is now active until 2026-10-25.	subscription	f	2026-09-25 05:32:54.717+03	\N	SUBSCRIPTION_ACTIVATED
989	77	Subscription activated	Your Livestock · Free subscription is now active until 2026-10-25.	subscription	f	2026-09-25 05:32:54.737+03	\N	SUBSCRIPTION_ACTIVATED
992	76	Subscription activated	Your Livestock · Free subscription is now active until 2026-11-24.	subscription	f	2026-09-25 08:25:22.835+03	\N	SUBSCRIPTION_ACTIVATED
993	76	Subscription activated	Your Livestock · Free subscription is now active until 2026-12-24.	subscription	f	2026-09-25 08:25:23.726+03	\N	SUBSCRIPTION_ACTIVATED
994	76	Subscription activated	Your Livestock · Free subscription is now active until 2027-01-23.	subscription	f	2026-09-25 08:25:24.657+03	\N	SUBSCRIPTION_ACTIVATED
995	76	Subscription activated	Your Livestock · Free subscription is now active until 2027-02-22.	subscription	f	2026-09-25 08:25:25.435+03	\N	SUBSCRIPTION_ACTIVATED
996	76	Subscription activated	Your Livestock · Free subscription is now active until 2027-03-24.	subscription	f	2026-09-25 08:25:26.301+03	\N	SUBSCRIPTION_ACTIVATED
997	76	Subscription activated	Your Livestock · Free subscription is now active until 2027-04-23.	subscription	f	2026-09-25 08:25:27.436+03	\N	SUBSCRIPTION_ACTIVATED
1003	81	Livestock price approved	Awr waa la aqbalay oo public ayaa laga arki karaa.	livestock	f	2026-09-25 17:18:43.575+03	1	PRICE_APPROVED
1004	81	Livestock price approved	Hal waa la aqbalay oo public ayaa laga arki karaa.	livestock	f	2026-09-25 17:19:17.880+03	1	PRICE_APPROVED
1005	81	Livestock price approved	Awr waa la aqbalay oo public ayaa laga arki karaa.	livestock	f	2026-09-25 17:19:38.601+03	1	PRICE_APPROVED
1008	81	Livestock price approved	Awr waa la aqbalay oo public ayaa laga arki karaa.	livestock	f	2026-09-25 17:28:19.102+03	1	PRICE_APPROVED
1009	81	Livestock price approved	Awr waa la aqbalay oo public ayaa laga arki karaa.	livestock	f	2026-09-25 17:28:20.733+03	1	PRICE_APPROVED
1038	7	Subscription activated	Your Silver subscription is now active until 2027-09-25.	subscription	f	2026-09-25 23:48:07.662+03	\N	SUBSCRIPTION_ACTIVATED
1039	113	Registration received	We received your MMPS application. An admin will review your documents. You will get a notification here if a file needs to be updated.	account	f	2026-09-26 00:00:55.809+03	\N	GENERAL
1041	113	Application approved	Your MMPS registration was approved. You can now open the Livestock Broker portal.	account	f	2026-09-26 00:01:08.946+03	\N	GENERAL
1043	7	Subscription activated	Your Diamond subscription is now active until 2027-09-26.	subscription	f	2026-09-26 05:36:39.272+03	\N	SUBSCRIPTION_ACTIVATED
1059	1	New livestock broker registration - Needs Verification	hana saaqle (hana@gmail.com) submitted a registration request and requires verification before approval.\n/super-admin/approvals	livestock	f	2026-09-27 05:40:12.487+03	\N	GENERAL
1061	1	New livestock broker registration - Needs Verification	hana al (hanaabdi@gmail.com) submitted a registration request and requires verification before approval.\n/super-admin/approvals	livestock	f	2026-09-27 06:43:15.952+03	\N	GENERAL
1063	1	New company registration - Needs Verification	hamar (salmo@gmail.com) submitted a registration request and requires verification before approval.\n/super-admin/approvals	water	f	2026-09-27 06:54:13.567+03	\N	GENERAL
1065	1	User approved	HAMAR is now approved.\n/super-admin/users	water	f	2026-09-27 06:55:42.527+03	\N	GENERAL
1067	1	New company registration - Needs Verification	hamar (hna123@gmail.com) submitted a registration request and requires verification before approval.\n/super-admin/approvals	water	f	2026-09-27 07:24:36.356+03	\N	GENERAL
1069	1	New company registration - Needs Verification	al harameyn (zahr@gmail.com) submitted a registration request and requires verification before approval.\n/super-admin/approvals	water	f	2026-09-27 09:00:22.236+03	\N	GENERAL
1071	1	User approved	AH is now approved.\n/super-admin/users	water	f	2026-09-27 09:08:22.303+03	\N	GENERAL
1073	1	New company registration - Needs Verification	hbhashshs (hana@gmail.com) submitted a registration request and requires verification before approval.\n/super-admin/approvals	water	f	2026-09-27 10:34:53.039+03	\N	GENERAL
1075	1	User approved	HBHASH is now approved.\n/super-admin/users	water	f	2026-09-27 10:35:16.885+03	\N	GENERAL
1076	124	Registration received	We received your MMPS application. An admin will review your documents. You will get a notification here if a file needs to be updated.	account	f	2026-09-27 11:05:00.029+03	\N	GENERAL
1077	1	New company registration - Needs Verification	hamar (mascuud@gmail.com) submitted a registration request and requires verification before approval.\n/super-admin/approvals	water	f	2026-09-27 11:05:00.109+03	\N	GENERAL
1078	124	Application approved	Your MMPS registration was approved. You can now open your Company Admin dashboard.	account	f	2026-09-27 11:07:18.083+03	\N	GENERAL
1079	1	User approved	HAMAR is now approved.\n/super-admin/users	water	f	2026-09-27 11:07:18.122+03	\N	GENERAL
\.


--
-- Data for Name: password_reset_tokens; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.password_reset_tokens (id, user_id, token_hash, expires_at, used_at, created_at, code_hash, attempts, last_sent_at) FROM stdin;
0fc83aa8f4d475aac08da0eb01ac16b9	1	ea38e5072a4d9b521a3886141c7821d585072671c147c368929d5858927d0f83	2026-08-19 15:40:29.897	2026-09-01 20:48:04.968	2026-08-19 15:30:29.897	ed1f3624fd17bb9c179303401c5196e4cf43c90bfadbb030a5c68136ef040d6c	0	2026-08-19 15:30:29.897
f64ad8c4b35a1dd52b550e654c97eabe	1	f639d1fefb726ef48fa520ab3651269a7a9a66a29d5084615be4ff1e5af4412b	2026-09-01 21:48:04.955	\N	2026-09-01 20:48:04.996		0	2026-09-01 23:48:04.998
df7f8cd879795ebcebbf982d187320d1	15	cc678715f9d2794d49d22e8b506a6b1248d8545b1a820f6c8d2e47a0666f22ea	2026-09-02 18:10:40.618	2026-09-02 17:14:56.861	2026-09-02 17:10:40.624		0	2026-09-02 20:10:40.624
7234a4f11e7148736b763b8fb463dfb0	15	9bb1d6091acf0edcaf8d80b8ba00243a658c06b8e56ab6e9c9b04c09bfdecfac	2026-09-02 18:14:56.857	2026-09-02 17:17:36.047	2026-09-02 17:14:56.88		0	2026-09-02 20:14:56.881
917a9d6ab3942f832e5902a862c9f01b	15	656940c82bee14d8ef8adebdf781b331874743206fe61e30b5b1019cd221c465	2026-09-02 18:17:36.043	2026-09-02 17:21:15.646	2026-09-02 17:17:36.057		0	2026-09-02 20:17:36.058
c3435b6a5ab3699a5ae9550533a187dd	15	b3caf46158b3869fa845ee9e382f787401620a50e04c8f55569e2deace4eb43f	2026-09-02 18:21:15.641	2026-09-02 17:22:35.059	2026-09-02 17:21:15.65		0	2026-09-02 20:21:15.65
1efa68ffa8d569d03962c1e1b1c98d4a	15	9ddeb76321b1654aaff8330297cab0ffe3ea347fc3a11e1b0a7ab6862c8ff00e	2026-09-02 18:22:35.053	2026-09-02 17:22:51.203	2026-09-02 17:22:35.064		0	2026-09-02 20:22:35.064
5fb09a197b1caa3acaf6c0a74669b2c5	7	afc7cec796ea552c17c21fc157968f2dd4f464ededcd3df30cc65055daf1ff7d	2026-09-05 20:19:27.682	\N	2026-09-05 19:19:27.856		0	2026-09-05 22:19:27.858
b070d0254c86cbdb1cba8844319e89d6	76	f0036596ab59bed80f8192ad605b15f4d59e7d2814e84f5d5758ddc1a3b4ae39	2026-09-09 13:46:17.837	2026-09-09 12:47:21.197	2026-09-09 12:46:17.842	\N	0	2026-09-09 12:46:17.842
\.


--
-- Data for Name: permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.permissions (id, code, name, description, module, created_at) FROM stdin;
77	MANAGE_LIVESTOCK_CATALOG	Manage Livestock Categories & Animal Types	\N	livestock	2026-08-28 05:55:49.658
1	VIEW_DASHBOARD	View Dashboard	\N	dashboard	2026-08-10 07:32:22.27
2	MANAGE_PROFILE	Manage Profile	\N	profile	2026-08-10 07:32:22.281
3	UPLOAD_PROFILE_IMAGE	Upload Profile Image	\N	profile	2026-08-10 07:32:22.284
4	MANAGE_COMPANY	Manage Company	\N	company	2026-08-10 07:32:22.286
6	MANAGE_USERS	Manage Users	\N	users	2026-08-10 07:32:22.29
7	CREATE_USER	Create User	\N	users	2026-08-10 07:32:22.294
8	EDIT_USER	Edit User	\N	users	2026-08-10 07:32:22.297
9	DELETE_USER	Delete User	\N	users	2026-08-10 07:32:22.298
10	MANAGE_ROLES	Manage Roles & Permissions	\N	roles	2026-08-10 07:32:22.301
14	MANAGE_COMPANIES	Manage Companies	\N	companies	2026-08-10 07:32:22.309
16	APPROVE_COMPANY	Approve Company	\N	companies	2026-08-10 07:32:22.315
17	MANAGE_LIVESTOCK_BROKERS	Manage Livestock Brokers	\N	brokers	2026-08-10 07:32:22.317
19	APPROVE_BROKER	Approve Broker	\N	brokers	2026-08-10 07:32:22.32
20	MANAGE_MARKETS	Manage Markets	\N	markets	2026-08-10 07:32:22.322
21	MANAGE_MARKET_SECTIONS	Manage Market Sections	\N	markets	2026-08-10 07:32:22.324
23	ADD_MARKET_PRICE	Add Market Price	\N	prices	2026-08-10 07:32:22.329
24	EDIT_MARKET_PRICE	Edit Market Price	\N	prices	2026-08-10 07:32:22.332
25	APPROVE_MARKET_PRICE	Approve Market Price	\N	prices	2026-08-10 07:32:22.334
26	REJECT_MARKET_PRICE	Reject Market Price	\N	prices	2026-08-10 07:32:22.336
27	ADD_LIVESTOCK_PRICE	Add Livestock Price	\N	livestock	2026-08-10 07:32:22.338
28	EDIT_LIVESTOCK_PRICE	Edit Livestock Price	\N	livestock	2026-08-10 07:32:22.34
29	APPROVE_LIVESTOCK_PRICE	Approve Livestock Price	\N	livestock	2026-08-10 07:32:22.342
30	VIEW_REPORTS	View Reports	\N	reports	2026-08-10 07:32:22.345
31	PRINT_REPORTS	Print Reports	\N	reports	2026-08-10 07:32:22.347
33	FILTER_REPORTS	Filter Reports	\N	reports	2026-08-10 07:32:22.352
34	MANAGE_SUBSCRIPTIONS	Manage Subscriptions	\N	subscriptions	2026-08-10 07:32:22.354
36	SEND_NOTIFICATIONS	Send Notifications	\N	notifications	2026-08-10 07:32:22.359
38	MANAGE_SYSTEM_SETTINGS	Manage System Settings	\N	settings	2026-08-10 07:32:22.366
\.


--
-- Data for Name: price_approvals; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.price_approvals (id, action, comment, reviewed_by, market_price_id, livestock_price_id, water_price_id, electricity_price_id, created_at) FROM stdin;
289	APPROVE	\N	1	\N	19904	\N	\N	2026-09-25 17:28:19.083
\.


--
-- Data for Name: registration_messages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.registration_messages (id, thread_user_id, sender_id, body, read_at, created_at) FROM stdin;
55	78	1	ha wall	2026-09-17 13:54:51.991+03	2026-09-17 13:54:51.523+03
37	7	7	superadmin	2026-09-06 05:07:09.512+03	2026-09-06 05:06:39.844+03
38	7	1	Thank you for registering with MMPS. Your electricity supply application is under review. We will reply here when we need more information or when a decision is ready.	\N	2026-09-06 05:07:09.55+03
39	15	15	asc	2026-09-06 05:12:36.952+03	2026-09-06 05:12:05.859+03
41	15	1	wcs	2026-09-07 10:05:28.843+03	2026-09-07 10:03:02.593+03
48	76	1	Thank you for registering with MMPS. Your livestock market section application is under review. We will reply here when we need more information or when a decision is ready.	\N	2026-09-09 02:15:53.413+03
49	77	1	Thank you for registering with MMPS. Your livestock market section application is under review. We will reply here when we need more information or when a decision is ready.	\N	2026-09-09 13:21:53.901+03
51	79	1	Thank you for registering with MMPS. Your livestock market section application is under review. We will reply here when we need more information or when a decision is ready.	\N	2026-09-09 18:58:33.958+03
52	80	1	Thank you for registering with MMPS. Your livestock market section application is under review. We will reply here when we need more information or when a decision is ready.	\N	2026-09-09 20:07:56.541+03
53	81	1	Thank you for registering with MMPS. Your livestock market section application is under review. We will reply here when we need more information or when a decision is ready.	\N	2026-09-11 16:50:22.448+03
50	78	1	Thank you for registering with MMPS. Your livestock market section application is under review. We will reply here when we need more information or when a decision is ready.	2026-09-17 13:54:28.707+03	2026-09-09 14:56:26.488+03
54	78	78	hhhjk	2026-09-17 13:54:40.707+03	2026-09-17 13:54:33.985+03
80	105	1	Thank you for registering with MMPS. Your electricity supply application is under review. We will reply here when we need more information or when a decision is ready.	\N	2026-09-25 09:05:31.915+03
88	113	1	Thank you for registering with MMPS. Your livestock market section application is under review. We will reply here when we need more information or when a decision is ready.	\N	2026-09-26 03:00:55.879+03
\.


--
-- Data for Name: registration_rejection_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.registration_rejection_history (id, user_id, previous_reason, new_reason, changed_by_id, created_at) FROM stdin;
\.


--
-- Data for Name: registration_timeline_events; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.registration_timeline_events (id, user_id, event_type, title, detail, status_label, actor_id, actor_label, visible_to_applicant, created_at) FROM stdin;
140	76	SUBMITTED	Application submitted	\N	Submitted	\N	\N	t	2026-09-08 23:15:53.309+03
141	76	UNDER_REVIEW	Application review started	\N	Under Review	\N	MMPS Administration	t	2026-09-08 23:15:54.309+03
142	76	DOCUMENTS_REVIEWED	Documents reviewed	\N	Documents Verified	1	MMPS Administration	t	2026-09-08 23:16:23.656+03
143	76	APPROVED	Application approved	\N	Approved	1	MMPS Administration	t	2026-09-08 23:16:23.665+03
144	77	SUBMITTED	Application submitted	\N	Submitted	\N	\N	t	2026-09-09 10:21:53.665+03
145	77	UNDER_REVIEW	Application review started	\N	Under Review	\N	MMPS Administration	t	2026-09-09 10:21:54.665+03
146	77	DOCUMENTS_REVIEWED	Documents reviewed	\N	Documents Verified	1	MMPS Administration	t	2026-09-09 10:22:08.657+03
147	77	APPROVED	Application approved	\N	Approved	1	MMPS Administration	t	2026-09-09 10:22:08.664+03
148	78	SUBMITTED	Application submitted	\N	Submitted	\N	\N	t	2026-09-09 11:56:26.394+03
149	78	UNDER_REVIEW	Application review started	\N	Under Review	\N	MMPS Administration	t	2026-09-09 11:56:27.394+03
150	78	DOCUMENTS_REVIEWED	Documents reviewed	\N	Documents Verified	1	MMPS Administration	t	2026-09-09 11:57:09.526+03
151	78	APPROVED	Application approved	\N	Approved	1	MMPS Administration	t	2026-09-09 11:57:09.534+03
152	79	SUBMITTED	Application submitted	\N	Submitted	\N	\N	t	2026-09-09 15:58:33.741+03
153	79	UNDER_REVIEW	Application review started	\N	Under Review	\N	MMPS Administration	t	2026-09-09 15:58:34.741+03
154	79	DOCUMENTS_REVIEWED	Documents reviewed	\N	Documents Verified	1	MMPS Administration	t	2026-09-09 15:58:46.312+03
155	79	APPROVED	Application approved	\N	Approved	1	MMPS Administration	t	2026-09-09 15:58:46.315+03
156	80	SUBMITTED	Application submitted	\N	Submitted	\N	\N	t	2026-09-09 17:07:56.413+03
157	80	UNDER_REVIEW	Application review started	\N	Under Review	\N	MMPS Administration	t	2026-09-09 17:07:57.413+03
158	80	DOCUMENTS_REVIEWED	Documents reviewed	\N	Documents Verified	1	MMPS Administration	t	2026-09-09 17:08:19.359+03
159	80	APPROVED	Application approved	\N	Approved	1	MMPS Administration	t	2026-09-09 17:08:19.371+03
160	81	SUBMITTED	Application submitted	\N	Submitted	\N	\N	t	2026-09-11 13:50:22.048+03
161	81	UNDER_REVIEW	Application review started	\N	Under Review	\N	MMPS Administration	t	2026-09-11 13:50:23.048+03
162	81	DOCUMENTS_REVIEWED	Documents reviewed	\N	Documents Verified	1	MMPS Administration	t	2026-09-11 13:51:23.141+03
163	81	APPROVED	Application approved	\N	Approved	1	MMPS Administration	t	2026-09-11 13:51:23.147+03
292	113	SUBMITTED	Application submitted	\N	Submitted	\N	\N	t	2026-09-26 00:00:55.777+03
293	113	UNDER_REVIEW	Application review started	\N	Under Review	\N	MMPS Administration	t	2026-09-26 00:00:56.777+03
294	113	DOCUMENTS_REVIEWED	Documents reviewed	\N	Documents Verified	1	MMPS Administration	t	2026-09-26 00:01:08.429+03
295	113	APPROVED	Application approved	\N	Approved	1	MMPS Administration	t	2026-09-26 00:01:08.439+03
329	124	SUBMITTED	Application submitted	\N	Submitted	\N	\N	t	2026-09-27 11:05:00.019+03
330	124	UNDER_REVIEW	Application review started	\N	Under Review	\N	MMPS Administration	t	2026-09-27 11:05:01.019+03
331	124	DOCUMENTS_REVIEWED	Documents reviewed	\N	Documents Verified	1	MMPS Administration	t	2026-09-27 11:06:25.687+03
332	124	DOCUMENT_ACCEPTED	Document accepted: Business registration certificate	\N	Accepted	1	MMPS Administration	t	2026-09-27 11:06:38.965+03
333	124	APPROVED	Application approved	\N	Approved	1	MMPS Administration	t	2026-09-27 11:07:17.971+03
\.


--
-- Data for Name: reports; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.reports (id, report_type, generated_date, generated_by, sector, summary) FROM stdin;
\.


--
-- Data for Name: role_permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.role_permissions (id, role, permission_id) FROM stdin;
2781	SUPER_ADMIN	1
2782	SUPER_ADMIN	2
2783	SUPER_ADMIN	3
2784	SUPER_ADMIN	4
2785	SUPER_ADMIN	6
2786	SUPER_ADMIN	7
2787	SUPER_ADMIN	8
2788	SUPER_ADMIN	9
2789	SUPER_ADMIN	10
2790	SUPER_ADMIN	14
2791	SUPER_ADMIN	16
2792	SUPER_ADMIN	17
2793	SUPER_ADMIN	19
2794	SUPER_ADMIN	77
2795	SUPER_ADMIN	20
2796	SUPER_ADMIN	21
2797	SUPER_ADMIN	25
2798	SUPER_ADMIN	26
2799	SUPER_ADMIN	29
2800	SUPER_ADMIN	30
2801	SUPER_ADMIN	31
2802	SUPER_ADMIN	33
2803	SUPER_ADMIN	34
2804	SUPER_ADMIN	36
2805	SUPER_ADMIN	38
3681	COMPANY_ADMIN	1
3682	COMPANY_ADMIN	2
3683	COMPANY_ADMIN	4
3684	COMPANY_ADMIN	23
3685	COMPANY_ADMIN	24
3686	COMPANY_ADMIN	30
3687	COMPANY_ADMIN	31
3688	COMPANY_ADMIN	33
3689	LIVESTOCK_BROKER_USER	1
3690	LIVESTOCK_BROKER_USER	2
3691	LIVESTOCK_BROKER_USER	27
3692	LIVESTOCK_BROKER_USER	28
3693	LIVESTOCK_BROKER_USER	30
3694	REGISTERED	2
\.


--
-- Data for Name: subscription_payment_proofs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.subscription_payment_proofs (id, subscription_id, receipt_file, status, submitted_by, reviewed_at, created_at) FROM stdin;
2	48	method:mastercard|****8936|07/29|HANI ABDIKADIR HASSAN	APPROVED	80	2026-09-24 13:09:53.726+03	2026-09-24 13:07:13.839+03
3	51	method:mastercard|****8936|07/29|HANI ABDIKADIR HASSAN|planId:30	APPROVED	78	2026-09-24 13:31:00.326+03	2026-09-24 13:29:56.508+03
4	49	method:mastercard|****8936|07/29|HANI ABDIKADIR HASSAN|planId:28	APPROVED	81	2026-09-24 13:48:10.711+03	2026-09-24 13:47:49.787+03
\.


--
-- Data for Name: subscription_plans; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.subscription_plans (id, name, description, price, duration_days, account_type, active, created_at, updated_at, max_markets, max_livestock_types) FROM stdin;
34	Pearl	$1.75/month × 12 = $21. All features, Full Price History, Detailed Reports.	21.00	365	ELECTRICITY	t	2026-09-23 21:26:31.626	2026-09-26 08:51:06.188	\N	\N
30	Pearl	$2.25/month × 12 = $27. All markets and all livestock types.	27.00	365	LIVESTOCK	t	2026-09-23 20:40:10.321	2026-09-26 08:51:06.188	\N	\N
37	Pearl	$1.25/month × 12 = $15. All features, Full Price History, Detailed Reports.	15.00	365	WATER	t	2026-09-23 21:32:46.177	2026-09-26 08:51:06.188	\N	\N
33	Silver	$2/month × 6 = $12. Price Calculator, Current Rate, Price History, Rate Changes.	12.00	180	ELECTRICITY	t	2026-09-23 21:26:31.624	2026-09-26 08:51:06.188	\N	\N
41	Gold	3 months	7.50	90	ELECTRICITY	t	2026-09-25 23:58:24.65	2026-09-26 08:51:06.188	\N	\N
36	Silver	$1.50/month × 6 = $9. Price Calculator, Current Rate, Price History, Rate Changes.	9.00	180	WATER	t	2026-09-23 21:32:46.173	2026-09-25 22:00:19.071	\N	\N
31	Free	Free: 1 market and 1 livestock type.	0.00	30	LIVESTOCK	t	2026-09-23 20:48:16.577	2026-09-25 22:00:19.075	1	1
28	Gold	$2.75/month × 3 = $8.25. Includes 2 markets and 2 livestock types.	8.25	90	LIVESTOCK	t	2026-09-23 20:40:10.31	2026-09-25 22:00:19.079	2	2
29	Silver	$2.50/month × 6 = $15. Includes 3 markets and 3 livestock types.	15.00	180	LIVESTOCK	t	2026-09-23 20:40:10.316	2026-09-25 22:00:19.082	3	3
32	Free	Free: Price Calculator and current electricity rate.	0.00	365	ELECTRICITY	t	2026-09-23 21:26:31.619	2026-09-25 23:50:06.679	\N	\N
35	Free	Free: Price Calculator and current water rate.	0.00	365	WATER	t	2026-09-23 21:32:46.149	2026-09-25 23:50:13.503	\N	\N
40	Gold	3 months	6.00	90	WATER	t	2026-09-25 23:58:24.634	2026-09-25 23:58:24.634	\N	\N
\.


--
-- Data for Name: subscriptions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.subscriptions (id, plan_id, company_id, broker_id, start_date, expiry_date, status, created_at, updated_at, ads_remaining, paid_months, paid_amount) FROM stdin;
47	28	\N	25	2026-01-01 10:00:00	2026-04-01 10:00:00	EXPIRED	2026-09-23 21:41:27.982	2026-09-24 09:37:55.189	35	\N	\N
48	29	\N	26	2026-09-24 10:09:53.726	2027-03-23 10:09:53.726	ACTIVE	2026-09-23 21:41:27.99	2026-09-24 10:09:53.75	160	\N	\N
51	30	\N	24	2026-09-24 10:31:00.326	2027-09-24 10:31:00.326	ACTIVE	2026-09-23 21:41:28.012	2026-09-24 10:31:00.333	\N	\N	\N
49	28	\N	27	2026-09-24 10:48:10.711	2026-12-23 10:48:10.711	ACTIVE	2026-09-23 21:41:27.998	2026-09-24 10:48:10.714	70	\N	\N
45	31	\N	23	2026-01-01 10:00:00	2026-10-25 05:32:54.693	ACTIVE	2026-09-23 21:41:27.952	2026-09-25 05:32:54.698	10	\N	0
46	31	\N	22	2026-01-01 10:00:00	2027-04-23 05:32:54.58	ACTIVE	2026-09-23 21:41:27.973	2026-09-25 08:25:27.406	10	\N	0
44	32	2	\N	2026-09-23 21:41:27.942	2027-09-23 21:41:27.942	ACTIVE	2026-09-23 21:41:27.944	2026-09-25 16:52:36.924	10	\N	0
38	33	23	\N	2026-09-25 23:50:36.276	2027-03-24 23:50:36.276	ACTIVE	2026-09-23 21:41:27.878	2026-09-25 23:50:36.278	10	\N	\N
39	34	24	\N	2026-09-25 23:50:36.28	2027-09-25 23:50:36.28	ACTIVE	2026-09-23 21:41:27.894	2026-09-25 23:50:36.281	10	\N	\N
40	36	1	\N	2026-09-25 23:50:36.283	2027-03-24 23:50:36.283	ACTIVE	2026-09-23 21:41:27.905	2026-09-25 23:50:36.284	10	\N	\N
42	37	21	\N	2026-09-25 23:50:36.287	2027-09-25 23:50:36.287	ACTIVE	2026-09-23 21:41:27.924	2026-09-25 23:50:36.288	10	\N	\N
43	36	20	\N	2026-09-25 23:50:36.289	2027-03-24 23:50:36.289	ACTIVE	2026-09-23 21:41:27.934	2026-09-25 23:50:36.29	10	\N	\N
76	33	2	\N	2026-09-25 23:50:36.291	2027-03-24 23:50:36.291	ACTIVE	2026-09-25 23:48:07.601	2026-09-25 23:50:36.292	\N	\N	\N
75	30	\N	39	2026-09-26 00:01:08.915	2026-10-26 00:01:08.915	ACTIVE	2026-09-25 23:42:37.013	2026-09-26 00:01:08.917	10	\N	\N
77	34	2	\N	2026-09-26 05:36:39.137	2027-09-26 05:36:39.137	ACTIVE	2026-09-26 05:36:39.233	2026-09-26 05:36:39.233	\N	\N	\N
82	40	55	\N	2026-09-27 10:35:16.766	2026-10-27 10:35:16.766	ACTIVE	2026-09-27 10:35:16.768	2026-09-27 10:35:16.768	35	1	2.00
83	40	56	\N	2026-09-27 11:07:18.061	2026-10-27 11:07:18.061	ACTIVE	2026-09-27 11:07:18.063	2026-09-27 11:07:18.063	35	1	2.00
\.


--
-- Data for Name: system_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.system_settings (id, key, value, updated_at, created_at) FROM stdin;
1	app_name	Somalia Market & Livestock Price Management System	2026-08-10 07:32:26.043	2026-08-10 07:32:26.043
2	app_short_name	SMLPMS	2026-08-10 07:32:26.053	2026-08-10 07:32:26.053
3	systemName	Muqdishu Market Price System	2026-09-05 12:42:21.887	2026-08-30 14:02:50.782
4	supportEmail	info@mmps.so	2026-09-05 12:42:21.887	2026-08-30 14:02:50.782
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, full_name, email, password, phone, company_name, company_sector, company_location, company_type, company_established_date, company_country, company_district, company_address, company_logo_file_name, company_registration_number, company_email, company_slug, contact_role, document_file_name, registration_documents, role, status, created_at, account_status, broker_id, company_id, deleted_at, profile_picture, updated_at, registration_password_enc, documents_reviewed_at, rejection_reason, rejected_at, rejected_by_id, registration_document_reviews, market_id) FROM stdin;
79	elhan abdikadir	elhan@gmail.com	$2b$12$.Gld8bMPlDguMDDeN2CtOuEI3d7Nz5Lgzc7uCfN/wp3cOWtrCDEIC	+252 615935334	elhan abdikadir	livestock	Suuqa xoolaha Livestock Market, Suuqa Xoolaha, Mogadishu, Mogadishu, Banadir, Somalia	Cattle Market Section|Goat Market Section	\N	Somalia	Hodan	Suuqa xoolaha Livestock Market	\N	\N	elhan@gmail.com	\N	Livestock Market Broker	\N	\N	LIVESTOCK_BROKER_USER	APPROVED	2026-01-01 10:00:00	ACTIVE	25	\N	\N	\N	2026-01-01 10:00:00	\N	2026-09-09 18:58:46.3+03	\N	\N	\N	\N	8
81	ahmed Abdikadir	ahmed@gmail.com	$2b$12$mfuB8jhRppOubCrae5TN8O6zvNCF91k2tFXjymBIwn/t0NOY/44Ni	+252 615343033	ahmed Abdikadir	livestock	Suuqa xoolaha Livestock Market, Suuqa Xoolaha, Mogadishu, Mogadishu, Banadir, Somalia	Camel Market Section|Cattle Market Section	\N	Somalia	Hodan	Suuqa xoolaha Livestock Market	\N	\N	ahmed@gmail.com	\N	Livestock Market Broker	\N	\N	LIVESTOCK_BROKER_USER	APPROVED	2026-01-01 10:00:00	ACTIVE	27	\N	\N	\N	2026-01-01 10:00:00	\N	2026-09-11 16:51:23.123+03	\N	\N	\N	\N	8
15	Mohamed Ahmed Nur	admin@wabax.so	$2b$12$UGK1xvdJaOTszBKNO9IqvO02fyeFXR7sXYAfSvYeQsi9BCW4CzgYW	+252 61 999 0049	WABAX Water Supply Co.	Water	\N	\N	\N	\N	Daynile	Afgoye–Mogadishu Road, Mogadishu, Somalia	\N	\N	admin@wabax.so	wabax	\N	\N	{"personal_photo":"/uploads/profiles/ca-15-1790115369838.jpg"}	COMPANY_ADMIN	APPROVED	2026-07-14 07:52:00	ACTIVE	\N	20	\N	/uploads/profiles/ca-15-1790115369838.jpg	2026-09-22 22:16:09.856	\N	\N	\N	\N	\N	\N	1
19	Abdirahman Hassan Yusuf	admin@blueskyenergy.so	$2b$12$9wb/VCZpE2FCVYNwh2rBB.qhGc9pXa08bcRnaK2fSptDaN3BUZgni	+252 62 899 9645	Blue Sky Energy	Electricity	\N	\N	\N	\N	Abdiaziz	Eng. Yariisow Stadium, Abdiaziz District, Mogadishu, Somalia	\N	\N	admin@blueskyenergy.so	blue-sky-energy	\N	\N	{"personal_photo":"/uploads/profiles/ca-19-1790115332506.jpg"}	COMPANY_ADMIN	APPROVED	2026-07-05 11:52:00	ACTIVE	\N	24	\N	/uploads/profiles/ca-19-1790115332506.jpg	2026-09-22 22:15:32.509	\N	\N	\N	\N	\N	\N	2
18	Ismail Abdi Omar	admin@mps.so	$2b$12$iiojgox0nHizhF3B56avVuX.zYG8tM7cklr6H4B2MYbkeVzrI1hji	+252 621 000 111	Mogadishu Power Supply	Electricity	\N	\N	\N	\N	Howlwadaag	Bakaro Market, Howlwadaag District, Mogadishu, Somalia	\N	\N	admin@mps.so	mogadishu-power-supply	\N	\N	{"personal_photo":"/uploads/profiles/ca-18-1790115475812.jpg"}	COMPANY_ADMIN	APPROVED	2026-07-08 06:52:00	ACTIVE	\N	23	\N	/uploads/profiles/ca-18-1790115475812.jpg	2026-09-22 22:17:55.815	\N	\N	\N	\N	\N	\N	2
16	Abdirizak Mohamed Hassan	admin@towfiiq.so	$2b$12$e.TXPt7/vi3vL.ANfLLdz.DKZtxu8WANutAFHnFEVoq7QNoYhyqaC	+252 610 795 571	Towfiiq	Water	\N	\N	\N	\N	Hodan	Sinai Street, Mogadishu, Somalia	\N	\N	admin@towfiiq.so	banadir-water	\N	\N	{"personal_photo":"/uploads/profiles/ca-16-1790115353821.jpg"}	COMPANY_ADMIN	APPROVED	2026-07-12 03:52:00	ACTIVE	\N	21	\N	/uploads/profiles/ca-16-1790115353821.jpg	2026-09-23 06:43:32.662	\N	\N	\N	\N	\N	\N	1
6	Yusuf Hussein Jimale	admin@bawadco.so	$2b$12$O5s75RcGtwO/6VgOlVLZDONFnsMGBAxgtcyZ7Lv/0ePmIEJEncJ5i	+252 613 491 008	Banadir Water Development Company	Water	\N	\N	\N	\N	Howlwadaag	Howlwadaag District, Banadir Region, Mogadishu, Somalia	\N	\N	info@bawadco.so	bawadco	\N	\N	{"personal_photo":"/uploads/profiles/ca-6-1790115395155.jpg"}	COMPANY_ADMIN	APPROVED	2026-08-10 07:32:25.043	ACTIVE	\N	1	\N	/uploads/profiles/ca-6-1790115395155.jpg	2026-09-22 22:16:35.158	\N	\N	\N	\N	\N	\N	1
76	Hana Abdikadir	haniabdikadir1@gmail.com	$2b$12$9V7hB6KJyNfOdi6H2CCcfez.10jPL14ZkE0CoaVgoHXEBrt5pN5UW	+252619643334	Hana Abdikadir	livestock	Medina Livestock Market, Medina, Mogadishu, Mogadishu, Banadir, Somalia	Camel Market Section	\N	Somalia	Hodan	Medina Livestock Market	\N	\N	haniabdikadir1@gmail.com	\N	Livestock Market Broker	\N	\N	LIVESTOCK_BROKER_USER	APPROVED	2026-01-01 10:00:00	ACTIVE	22	\N	\N	\N	2026-01-01 10:00:00	\N	2026-09-09 02:16:23.633+03	\N	\N	\N	\N	10
80	ismahaan abdikadir	ismahaan@gmail.com	$2b$12$SFSOrYdiFs6MMwxQiEYBD.a0GCSqmaSMt.K6yVHb4hXdPoXQy19x2	+252 619235555	ismahaan abdikadir	livestock	Dayax Livestock Market, Dayax, Mogadishu, Mogadishu, Banadir, Somalia	Camel Market Section|Cattle Market Section|Goat Market Section	\N	Somalia	Hodan	Dayax Livestock Market	\N	\N	ismahaan@gmail.com	\N	Livestock Market Broker	\N	\N	LIVESTOCK_BROKER_USER	APPROVED	2026-01-01 10:00:00	ACTIVE	26	\N	\N	\N	2026-01-01 10:00:00	\N	2026-09-09 20:08:19.336+03	\N	\N	\N	\N	9
1	Super Admin	superadmin@mmps.so	$2b$12$5OOE7g5XvuJRaIY1YRGJWe19LYJPIUR4sCvJyJ2LaoqK8TqD/rL1i	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	SUPER_ADMIN	APPROVED	2026-08-08 08:34:49.546	ACTIVE	\N	\N	\N	/uploads/profiles/sa-1-1788612140722.png	2026-09-05 12:42:21.852	\N	\N	\N	\N	\N	\N	\N
77	Mohamed Hassan	mohamed@gmail.com	$2b$12$KEWCq9IlDdx/E3QWb89J9ut24iOw5uhi4ovePA4pm3.OecORP2QjG	+252 615088596	Mohamed Hassan	livestock	Sinka dheer Livestock Market, Sinka Dheer, Mogadishu, Mogadishu, Banadir, Somalia	Cattle Market Section	\N	Somalia	Hodan	Sinka dheer Livestock Market	\N	\N	mohamed@gmail.com	\N	Livestock Market Broker	\N	\N	LIVESTOCK_BROKER_USER	APPROVED	2026-01-01 10:00:00	ACTIVE	23	\N	\N	\N	2026-01-01 10:00:00	\N	2026-09-09 13:22:08.644+03	\N	\N	\N	\N	7
78	zahra ahmed	zahra@gmail.com	$2b$12$QleJUuytKJ4SvjxwN6CJ2.XX53DMwYUque4pdA1h9QUuI06caCxEa	+252 617175998	zahra ahmed	livestock	Deniile livestock market, Dayniile, Mogadishu, Mogadishu, Banadir, Somalia	Goat Market Section	\N	Somalia	Hodan	Deniile livestock market	\N	\N	zahra@gmail.com	\N	Livestock Market Broker	\N	\N	LIVESTOCK_BROKER_USER	APPROVED	2026-01-01 10:00:00	ACTIVE	24	\N	\N	\N	2026-01-01 10:00:00	\N	2026-09-09 14:57:09.51+03	\N	\N	\N	\N	6
7	Mohamed Abdi Ibrahim	admin@beco.so	$2b$12$eDL9XM1/CwMoXXhq1EcUxOE5Gxz8n2vmmwzCaJxbjIKuOXNK0GIFC	+252 619 111 114	BECO	Electricity	\N	\N	\N	\N	Hodan	Tarabuun Street, Hodan District, Mogadishu, Somalia	\N	\N	contact@beco.so	beco	\N	\N	{"personal_photo":"/uploads/profiles/ca-7-1788816085782.jpg"}	COMPANY_ADMIN	APPROVED	2026-08-10 07:32:25.049	ACTIVE	\N	2	\N	/uploads/profiles/ca-7-1788816085782.jpg	2026-09-25 23:39:55.305	\N	\N	\N	\N	\N	\N	2
113	hana saaqle	hanisaa@gmail.com	$2b$12$JxY6mErJmlPam2D/wPsB1OMphbmdCwhnLrG0eUvucwSOF7kwfoqoG	+252619643334	hana saaqle	livestock	Deniile livestock market, Sinka dheer Livestock Market, Dayax Livestock Market, Suuqa xoolaha Livestock Market, Medina Livestock Market, Dayniile, Mogadishu, Mogadishu, Banadir, Somalia	Camel Market Section|Cattle Market Section|Goat Market Section	\N	Somalia	\N	Deniile livestock market, Sinka dheer Livestock Market, Dayax Livestock Market, Suuqa xoolaha Livestock Market, Medina Livestock Market	\N	\N	hanisaa@gmail.com	\N	Livestock Market Broker	\N	{"plan_id":"30","plan_price":"27","plan_duration_days":"365","pay_months":"1","plan_name":"Diamond","plan_sector":"LIVESTOCK","market_ids":"6,7,9,8,10","payment_method":"mastercard","payment_card_holder":"HANI ABDIKADIR HASSAN","payment_card_last4":"8936","payment_card_expiry":"07/29","market_names":"Deniile livestock market, Sinka dheer Livestock Market, Dayax Livestock Market, Suuqa xoolaha Livestock Market, Medina Livestock Market"}	LIVESTOCK_BROKER_USER	APPROVED	2026-09-26 00:00:55.777	ACTIVE	39	\N	\N	\N	2026-09-26 00:01:08.957	\N	2026-09-26 03:01:08.415+03	\N	\N	\N	\N	6
124	mmascuud ahmed	mascuud@gmail.com	$2b$12$jvoVWIqFSrAKUECVD6gouerMbHtARDJeZu1OIA2rQ9PeZSqOqzjei	+252 615527447	hamar	water	hool wadaag, Abdiaziz District, Banadir Region, Somalia	Water Supply Company	\N	Somalia	Abdiaziz	hool wadaag	\N	\N	hamar@hrm.so	hamar	Company Admin / Signatory	1790507099261-Logo.jpeg	{"business_license":"1790507099261-Logo.jpeg","id_passport":"1790507099271-self.jpeg","personal_photo":"1790507099283-ys.jpeg","plan_id":"40","plan_price":"6","plan_duration_days":"90","paid_amount":"2.00","pay_months":"1","plan_name":"Gold","plan_sector":"WATER","payment_method":"mastercard","payment_card_holder":"HANI ABDIKADIR HASSAN","payment_card_last4":"8936","payment_card_expiry":"07/29"}	COMPANY_ADMIN	APPROVED	2026-09-27 11:05:00.019	ACTIVE	\N	56	\N	\N	2026-09-27 11:07:18.091	\N	2026-09-27 14:06:25.676+03	\N	\N	\N	{"business_license":{"status":"ACCEPTED","reason":null,"reviewedAt":"2026-09-27T11:06:38.937Z","reviewedById":1,"reviewedByName":"Super Admin","reuploaded":false,"replacedAt":null}}	\N
\.


--
-- Data for Name: verification_codes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.verification_codes (id, user_id, code, verified, verified_at, created_at, expires_at, attempts, locked_until) FROM stdin;
40	76	799849	f	\N	2026-09-08 23:15:53.436	2026-09-09 23:15:53.433	0	\N
41	77	523611	f	\N	2026-09-09 10:21:53.93	2026-09-10 10:21:53.927	0	\N
42	78	371440	f	\N	2026-09-09 11:56:26.504	2026-09-10 11:56:26.502	0	\N
43	79	449306	f	\N	2026-09-09 15:58:34.001	2026-09-10 15:58:33.999	0	\N
44	80	404971	f	\N	2026-09-09 17:07:56.572	2026-09-10 17:07:56.567	0	\N
45	81	883603	f	\N	2026-09-11 13:50:22.526	2026-09-12 13:50:22.523	0	\N
69	105	723240	f	\N	2026-09-25 06:05:32.016	2026-09-26 06:05:32.012	0	\N
77	113	964842	f	\N	2026-09-26 00:00:55.9	2026-09-27 00:00:55.899	0	\N
\.


--
-- Data for Name: water_prices; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.water_prices (id, provider_name, water_type, location, price_per_unit, date_recorded, updated_by, approved_at, approved_by, rejected_at, rejected_by, rejection_reason, status) FROM stdin;
\.


--
-- Name: companies_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.companies_id_seq', 56, true);


--
-- Name: company_documents_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.company_documents_id_seq', 45, true);


--
-- Name: electricity_prices_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.electricity_prices_id_seq', 4, true);


--
-- Name: favorites_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.favorites_id_seq', 1, false);


--
-- Name: livestock_animal_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.livestock_animal_types_id_seq', 59381, true);


--
-- Name: livestock_brokers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.livestock_brokers_id_seq', 40, true);


--
-- Name: livestock_categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.livestock_categories_id_seq', 10033, true);


--
-- Name: livestock_prices_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.livestock_prices_id_seq', 19904, true);


--
-- Name: market_prices_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.market_prices_id_seq', 1, false);


--
-- Name: market_sections_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.market_sections_id_seq', 12, true);


--
-- Name: markets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.markets_id_seq', 28, true);


--
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.notifications_id_seq', 1079, true);


--
-- Name: permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.permissions_id_seq', 5300, true);


--
-- Name: price_approvals_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.price_approvals_id_seq', 290, true);


--
-- Name: registration_messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.registration_messages_id_seq', 88, true);


--
-- Name: registration_rejection_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.registration_rejection_history_id_seq', 3, true);


--
-- Name: registration_timeline_events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.registration_timeline_events_id_seq', 333, true);


--
-- Name: reports_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.reports_id_seq', 1, false);


--
-- Name: role_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.role_permissions_id_seq', 3694, true);


--
-- Name: subscription_payment_proofs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.subscription_payment_proofs_id_seq', 4, true);


--
-- Name: subscription_plans_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.subscription_plans_id_seq', 41, true);


--
-- Name: subscriptions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.subscriptions_id_seq', 83, true);


--
-- Name: system_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.system_settings_id_seq', 6, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 124, true);


--
-- Name: verification_codes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.verification_codes_id_seq', 77, true);


--
-- Name: water_prices_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.water_prices_id_seq', 24, true);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: admin_sessions admin_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_sessions
    ADD CONSTRAINT admin_sessions_pkey PRIMARY KEY (id);


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- Name: company_documents company_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_documents
    ADD CONSTRAINT company_documents_pkey PRIMARY KEY (id);


--
-- Name: electricity_prices electricity_prices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.electricity_prices
    ADD CONSTRAINT electricity_prices_pkey PRIMARY KEY (id);


--
-- Name: favorites favorites_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_pkey PRIMARY KEY (id);


--
-- Name: livestock_animal_types livestock_animal_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.livestock_animal_types
    ADD CONSTRAINT livestock_animal_types_pkey PRIMARY KEY (id);


--
-- Name: livestock_broker_animal_types livestock_broker_animal_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.livestock_broker_animal_types
    ADD CONSTRAINT livestock_broker_animal_types_pkey PRIMARY KEY (broker_id, animal_type_id);


--
-- Name: livestock_broker_categories livestock_broker_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.livestock_broker_categories
    ADD CONSTRAINT livestock_broker_categories_pkey PRIMARY KEY (broker_id, category_id);


--
-- Name: livestock_broker_markets livestock_broker_markets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.livestock_broker_markets
    ADD CONSTRAINT livestock_broker_markets_pkey PRIMARY KEY (broker_id, market_id);


--
-- Name: livestock_brokers livestock_brokers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.livestock_brokers
    ADD CONSTRAINT livestock_brokers_pkey PRIMARY KEY (id);


--
-- Name: livestock_categories livestock_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.livestock_categories
    ADD CONSTRAINT livestock_categories_pkey PRIMARY KEY (id);


--
-- Name: livestock_market_categories livestock_market_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.livestock_market_categories
    ADD CONSTRAINT livestock_market_categories_pkey PRIMARY KEY (market_id, category_id);


--
-- Name: livestock_prices livestock_prices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.livestock_prices
    ADD CONSTRAINT livestock_prices_pkey PRIMARY KEY (id);


--
-- Name: market_prices market_prices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.market_prices
    ADD CONSTRAINT market_prices_pkey PRIMARY KEY (id);


--
-- Name: market_sections market_sections_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.market_sections
    ADD CONSTRAINT market_sections_pkey PRIMARY KEY (id);


--
-- Name: markets markets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.markets
    ADD CONSTRAINT markets_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: price_approvals price_approvals_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.price_approvals
    ADD CONSTRAINT price_approvals_pkey PRIMARY KEY (id);


--
-- Name: registration_messages registration_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.registration_messages
    ADD CONSTRAINT registration_messages_pkey PRIMARY KEY (id);


--
-- Name: registration_rejection_history registration_rejection_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.registration_rejection_history
    ADD CONSTRAINT registration_rejection_history_pkey PRIMARY KEY (id);


--
-- Name: registration_timeline_events registration_timeline_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.registration_timeline_events
    ADD CONSTRAINT registration_timeline_events_pkey PRIMARY KEY (id);


--
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (id);


--
-- Name: subscription_payment_proofs subscription_payment_proofs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscription_payment_proofs
    ADD CONSTRAINT subscription_payment_proofs_pkey PRIMARY KEY (id);


--
-- Name: subscription_plans subscription_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscription_plans
    ADD CONSTRAINT subscription_plans_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: verification_codes verification_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.verification_codes
    ADD CONSTRAINT verification_codes_pkey PRIMARY KEY (id);


--
-- Name: water_prices water_prices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.water_prices
    ADD CONSTRAINT water_prices_pkey PRIMARY KEY (id);


--
-- Name: _CompanySections_AB_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "_CompanySections_AB_unique" ON public."_CompanySections" USING btree ("A", "B");


--
-- Name: _CompanySections_B_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "_CompanySections_B_index" ON public."_CompanySections" USING btree ("B");


--
-- Name: admin_sessions_expires_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX admin_sessions_expires_at_idx ON public.admin_sessions USING btree (expires_at);


--
-- Name: admin_sessions_user_id_revoked_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX admin_sessions_user_id_revoked_at_idx ON public.admin_sessions USING btree (user_id, revoked_at);


--
-- Name: companies_slug_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX companies_slug_key ON public.companies USING btree (slug);


--
-- Name: companies_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX companies_status_idx ON public.companies USING btree (status);


--
-- Name: companies_type_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX companies_type_idx ON public.companies USING btree (type);


--
-- Name: company_documents_company_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX company_documents_company_id_idx ON public.company_documents USING btree (company_id);


--
-- Name: electricity_prices_date_recorded_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX electricity_prices_date_recorded_idx ON public.electricity_prices USING btree (date_recorded);


--
-- Name: electricity_prices_location_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX electricity_prices_location_idx ON public.electricity_prices USING btree (location);


--
-- Name: favorites_user_id_sector_category_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX favorites_user_id_sector_category_key ON public.favorites USING btree (user_id, sector, category);


--
-- Name: livestock_animal_types_category_id_slug_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX livestock_animal_types_category_id_slug_key ON public.livestock_animal_types USING btree (category_id, slug);


--
-- Name: livestock_animal_types_category_id_status_sort_order_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX livestock_animal_types_category_id_status_sort_order_idx ON public.livestock_animal_types USING btree (category_id, status, sort_order);


--
-- Name: livestock_broker_animal_types_animal_type_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX livestock_broker_animal_types_animal_type_id_idx ON public.livestock_broker_animal_types USING btree (animal_type_id);


--
-- Name: livestock_broker_categories_category_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX livestock_broker_categories_category_id_idx ON public.livestock_broker_categories USING btree (category_id);


--
-- Name: livestock_broker_markets_market_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX livestock_broker_markets_market_id_idx ON public.livestock_broker_markets USING btree (market_id);


--
-- Name: livestock_brokers_approval_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX livestock_brokers_approval_status_idx ON public.livestock_brokers USING btree (approval_status);


--
-- Name: livestock_brokers_broker_code_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX livestock_brokers_broker_code_key ON public.livestock_brokers USING btree (broker_code);


--
-- Name: livestock_brokers_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX livestock_brokers_email_key ON public.livestock_brokers USING btree (email);


--
-- Name: livestock_brokers_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX livestock_brokers_status_idx ON public.livestock_brokers USING btree (status);


--
-- Name: livestock_categories_slug_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX livestock_categories_slug_key ON public.livestock_categories USING btree (slug);


--
-- Name: livestock_categories_status_sort_order_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX livestock_categories_status_sort_order_idx ON public.livestock_categories USING btree (status, sort_order);


--
-- Name: livestock_market_categories_category_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX livestock_market_categories_category_id_idx ON public.livestock_market_categories USING btree (category_id);


--
-- Name: livestock_prices_animal_type_market_location_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX livestock_prices_animal_type_market_location_idx ON public.livestock_prices USING btree (animal_type, market_location);


--
-- Name: livestock_prices_broker_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX livestock_prices_broker_id_idx ON public.livestock_prices USING btree (broker_id);


--
-- Name: livestock_prices_date_recorded_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX livestock_prices_date_recorded_idx ON public.livestock_prices USING btree (date_recorded);


--
-- Name: livestock_prices_livestock_category_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX livestock_prices_livestock_category_id_idx ON public.livestock_prices USING btree (livestock_category_id);


--
-- Name: livestock_prices_livestock_type_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX livestock_prices_livestock_type_id_idx ON public.livestock_prices USING btree (livestock_type_id);


--
-- Name: livestock_prices_market_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX livestock_prices_market_id_idx ON public.livestock_prices USING btree (market_id);


--
-- Name: livestock_prices_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX livestock_prices_status_idx ON public.livestock_prices USING btree (status);


--
-- Name: market_prices_company_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX market_prices_company_id_idx ON public.market_prices USING btree (company_id);


--
-- Name: market_prices_status_effective_date_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX market_prices_status_effective_date_idx ON public.market_prices USING btree (status, effective_date);


--
-- Name: market_sections_market_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX market_sections_market_id_idx ON public.market_sections USING btree (market_id);


--
-- Name: market_sections_market_id_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX market_sections_market_id_name_key ON public.market_sections USING btree (market_id, name);


--
-- Name: markets_code_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX markets_code_key ON public.markets USING btree (code);


--
-- Name: markets_market_type_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX markets_market_type_status_idx ON public.markets USING btree (market_type, status);


--
-- Name: notifications_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX notifications_created_at_idx ON public.notifications USING btree (created_at);


--
-- Name: notifications_user_id_read_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX notifications_user_id_read_idx ON public.notifications USING btree (user_id, read);


--
-- Name: password_reset_tokens_token_hash_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX password_reset_tokens_token_hash_key ON public.password_reset_tokens USING btree (token_hash);


--
-- Name: password_reset_tokens_user_id_expires_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX password_reset_tokens_user_id_expires_at_idx ON public.password_reset_tokens USING btree (user_id, expires_at);


--
-- Name: permissions_code_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX permissions_code_key ON public.permissions USING btree (code);


--
-- Name: price_approvals_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX price_approvals_created_at_idx ON public.price_approvals USING btree (created_at);


--
-- Name: registration_messages_sender_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX registration_messages_sender_id_idx ON public.registration_messages USING btree (sender_id);


--
-- Name: registration_messages_thread_user_id_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX registration_messages_thread_user_id_created_at_idx ON public.registration_messages USING btree (thread_user_id, created_at);


--
-- Name: registration_rejection_history_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX registration_rejection_history_user_id_idx ON public.registration_rejection_history USING btree (user_id);


--
-- Name: registration_timeline_events_user_id_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX registration_timeline_events_user_id_created_at_idx ON public.registration_timeline_events USING btree (user_id, created_at);


--
-- Name: role_permissions_role_permission_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX role_permissions_role_permission_id_key ON public.role_permissions USING btree (role, permission_id);


--
-- Name: subscription_payment_proofs_subscription_id_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX subscription_payment_proofs_subscription_id_status_idx ON public.subscription_payment_proofs USING btree (subscription_id, status);


--
-- Name: subscriptions_broker_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX subscriptions_broker_id_idx ON public.subscriptions USING btree (broker_id);


--
-- Name: subscriptions_company_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX subscriptions_company_id_idx ON public.subscriptions USING btree (company_id);


--
-- Name: subscriptions_status_expiry_date_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX subscriptions_status_expiry_date_idx ON public.subscriptions USING btree (status, expiry_date);


--
-- Name: system_settings_key_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX system_settings_key_key ON public.system_settings USING btree (key);


--
-- Name: users_broker_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX users_broker_id_idx ON public.users USING btree (broker_id);


--
-- Name: users_company_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX users_company_id_idx ON public.users USING btree (company_id);


--
-- Name: users_company_slug_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX users_company_slug_key ON public.users USING btree (company_slug);


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- Name: users_market_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX users_market_id_idx ON public.users USING btree (market_id);


--
-- Name: users_rejected_by_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX users_rejected_by_id_idx ON public.users USING btree (rejected_by_id);


--
-- Name: users_role_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX users_role_status_idx ON public.users USING btree (role, status);


--
-- Name: verification_codes_code_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX verification_codes_code_key ON public.verification_codes USING btree (code);


--
-- Name: verification_codes_user_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX verification_codes_user_id_key ON public.verification_codes USING btree (user_id);


--
-- Name: water_prices_date_recorded_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX water_prices_date_recorded_idx ON public.water_prices USING btree (date_recorded);


--
-- Name: water_prices_location_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX water_prices_location_idx ON public.water_prices USING btree (location);


--
-- Name: _CompanySections _CompanySections_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_CompanySections"
    ADD CONSTRAINT "_CompanySections_A_fkey" FOREIGN KEY ("A") REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _CompanySections _CompanySections_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_CompanySections"
    ADD CONSTRAINT "_CompanySections_B_fkey" FOREIGN KEY ("B") REFERENCES public.market_sections(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: admin_sessions admin_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_sessions
    ADD CONSTRAINT admin_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: companies companies_market_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_market_id_fkey FOREIGN KEY (market_id) REFERENCES public.markets(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: company_documents company_documents_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_documents
    ADD CONSTRAINT company_documents_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: company_documents company_documents_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_documents
    ADD CONSTRAINT company_documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: electricity_prices electricity_prices_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.electricity_prices
    ADD CONSTRAINT electricity_prices_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: electricity_prices electricity_prices_rejected_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.electricity_prices
    ADD CONSTRAINT electricity_prices_rejected_by_fkey FOREIGN KEY (rejected_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: electricity_prices electricity_prices_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.electricity_prices
    ADD CONSTRAINT electricity_prices_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: favorites favorites_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: livestock_animal_types livestock_animal_types_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.livestock_animal_types
    ADD CONSTRAINT livestock_animal_types_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.livestock_categories(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: livestock_broker_animal_types livestock_broker_animal_types_animal_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.livestock_broker_animal_types
    ADD CONSTRAINT livestock_broker_animal_types_animal_type_id_fkey FOREIGN KEY (animal_type_id) REFERENCES public.livestock_animal_types(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: livestock_broker_animal_types livestock_broker_animal_types_broker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.livestock_broker_animal_types
    ADD CONSTRAINT livestock_broker_animal_types_broker_id_fkey FOREIGN KEY (broker_id) REFERENCES public.livestock_brokers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: livestock_broker_categories livestock_broker_categories_broker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.livestock_broker_categories
    ADD CONSTRAINT livestock_broker_categories_broker_id_fkey FOREIGN KEY (broker_id) REFERENCES public.livestock_brokers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: livestock_broker_categories livestock_broker_categories_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.livestock_broker_categories
    ADD CONSTRAINT livestock_broker_categories_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.livestock_categories(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: livestock_broker_markets livestock_broker_markets_broker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.livestock_broker_markets
    ADD CONSTRAINT livestock_broker_markets_broker_id_fkey FOREIGN KEY (broker_id) REFERENCES public.livestock_brokers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: livestock_broker_markets livestock_broker_markets_market_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.livestock_broker_markets
    ADD CONSTRAINT livestock_broker_markets_market_id_fkey FOREIGN KEY (market_id) REFERENCES public.markets(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: livestock_brokers livestock_brokers_market_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.livestock_brokers
    ADD CONSTRAINT livestock_brokers_market_id_fkey FOREIGN KEY (market_id) REFERENCES public.markets(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: livestock_market_categories livestock_market_categories_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.livestock_market_categories
    ADD CONSTRAINT livestock_market_categories_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.livestock_categories(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: livestock_market_categories livestock_market_categories_market_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.livestock_market_categories
    ADD CONSTRAINT livestock_market_categories_market_id_fkey FOREIGN KEY (market_id) REFERENCES public.markets(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: livestock_prices livestock_prices_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.livestock_prices
    ADD CONSTRAINT livestock_prices_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: livestock_prices livestock_prices_broker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.livestock_prices
    ADD CONSTRAINT livestock_prices_broker_id_fkey FOREIGN KEY (broker_id) REFERENCES public.livestock_brokers(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: livestock_prices livestock_prices_livestock_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.livestock_prices
    ADD CONSTRAINT livestock_prices_livestock_category_id_fkey FOREIGN KEY (livestock_category_id) REFERENCES public.livestock_categories(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: livestock_prices livestock_prices_livestock_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.livestock_prices
    ADD CONSTRAINT livestock_prices_livestock_type_id_fkey FOREIGN KEY (livestock_type_id) REFERENCES public.livestock_animal_types(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: livestock_prices livestock_prices_market_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.livestock_prices
    ADD CONSTRAINT livestock_prices_market_id_fkey FOREIGN KEY (market_id) REFERENCES public.markets(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: livestock_prices livestock_prices_rejected_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.livestock_prices
    ADD CONSTRAINT livestock_prices_rejected_by_fkey FOREIGN KEY (rejected_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: livestock_prices livestock_prices_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.livestock_prices
    ADD CONSTRAINT livestock_prices_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: market_prices market_prices_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.market_prices
    ADD CONSTRAINT market_prices_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: market_prices market_prices_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.market_prices
    ADD CONSTRAINT market_prices_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: market_prices market_prices_market_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.market_prices
    ADD CONSTRAINT market_prices_market_id_fkey FOREIGN KEY (market_id) REFERENCES public.markets(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: market_prices market_prices_rejected_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.market_prices
    ADD CONSTRAINT market_prices_rejected_by_fkey FOREIGN KEY (rejected_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: market_prices market_prices_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.market_prices
    ADD CONSTRAINT market_prices_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.market_sections(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: market_prices market_prices_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.market_prices
    ADD CONSTRAINT market_prices_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: market_sections market_sections_market_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.market_sections
    ADD CONSTRAINT market_sections_market_id_fkey FOREIGN KEY (market_id) REFERENCES public.markets(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: notifications notifications_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: password_reset_tokens password_reset_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: price_approvals price_approvals_electricity_price_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.price_approvals
    ADD CONSTRAINT price_approvals_electricity_price_id_fkey FOREIGN KEY (electricity_price_id) REFERENCES public.electricity_prices(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: price_approvals price_approvals_livestock_price_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.price_approvals
    ADD CONSTRAINT price_approvals_livestock_price_id_fkey FOREIGN KEY (livestock_price_id) REFERENCES public.livestock_prices(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: price_approvals price_approvals_market_price_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.price_approvals
    ADD CONSTRAINT price_approvals_market_price_id_fkey FOREIGN KEY (market_price_id) REFERENCES public.market_prices(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: price_approvals price_approvals_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.price_approvals
    ADD CONSTRAINT price_approvals_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: price_approvals price_approvals_water_price_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.price_approvals
    ADD CONSTRAINT price_approvals_water_price_id_fkey FOREIGN KEY (water_price_id) REFERENCES public.water_prices(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: registration_messages registration_messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.registration_messages
    ADD CONSTRAINT registration_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: registration_messages registration_messages_thread_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.registration_messages
    ADD CONSTRAINT registration_messages_thread_user_id_fkey FOREIGN KEY (thread_user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: registration_rejection_history registration_rejection_history_changed_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.registration_rejection_history
    ADD CONSTRAINT registration_rejection_history_changed_by_id_fkey FOREIGN KEY (changed_by_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: registration_rejection_history registration_rejection_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.registration_rejection_history
    ADD CONSTRAINT registration_rejection_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: registration_timeline_events registration_timeline_events_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.registration_timeline_events
    ADD CONSTRAINT registration_timeline_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: reports reports_generated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_generated_by_fkey FOREIGN KEY (generated_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: role_permissions role_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: subscription_payment_proofs subscription_payment_proofs_subscription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscription_payment_proofs
    ADD CONSTRAINT subscription_payment_proofs_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id) ON DELETE CASCADE;


--
-- Name: subscriptions subscriptions_broker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_broker_id_fkey FOREIGN KEY (broker_id) REFERENCES public.livestock_brokers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: subscriptions subscriptions_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: subscriptions subscriptions_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.subscription_plans(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: users users_broker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_broker_id_fkey FOREIGN KEY (broker_id) REFERENCES public.livestock_brokers(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: users users_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: users users_market_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_market_id_fkey FOREIGN KEY (market_id) REFERENCES public.markets(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: users users_rejected_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_rejected_by_id_fkey FOREIGN KEY (rejected_by_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: verification_codes verification_codes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.verification_codes
    ADD CONSTRAINT verification_codes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: water_prices water_prices_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.water_prices
    ADD CONSTRAINT water_prices_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: water_prices water_prices_rejected_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.water_prices
    ADD CONSTRAINT water_prices_rejected_by_fkey FOREIGN KEY (rejected_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: water_prices water_prices_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.water_prices
    ADD CONSTRAINT water_prices_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

\unrestrict EG2l6MtDPtEpR9ErGfbOavubcsg0f0zw0D3AhmaPocbST6dJaELz93IIld0ibb3

