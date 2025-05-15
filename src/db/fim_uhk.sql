--
-- PostgreSQL database dump
--

-- Dumped from database version 15.10 (ozeias)
-- Dumped by pg_dump version 15.10 (ozeias)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: category_to_task(integer, character varying); Type: PROCEDURE; Schema: public; Owner: -
--

CREATE PROCEDURE public.category_to_task(IN p_task_id integer, IN p_category_name character varying)
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_category_id INTEGER;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM category WHERE name = p_category_name) THEN
        INSERT INTO category (name) VALUES (p_category_name);
    END IF;

    SELECT category_id INTO v_category_id FROM category WHERE name = p_category_name;
    
    INSERT INTO task_category (task_id, category_id) 
    VALUES (p_task_id, v_category_id);
END;
$$;


--
-- Name: delete_answers_for_task(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.delete_answers_for_task() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  DELETE FROM answer WHERE task_id = OLD.task_id;
  RETURN OLD;
END;
$$;


--
-- Name: generate_payment_uid(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_payment_uid() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.payment_uid IS NULL THEN
    NEW.payment_uid := gen_random_uuid();
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: get_tasks_by_parametres(date, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_tasks_by_parametres(p_due_date date, p_price integer) RETURNS TABLE(task_id integer, title character varying, price integer, due_date date, full_name character varying)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.task_id,
        t.title,
        t.price,
        t.due_date,
        a.full_name
    FROM task t
    LEFT JOIN app_user a ON t.app_user_id = a.app_user_id
    WHERE (t.due_date >= p_due_date OR p_due_date IS NULL) AND t.price >= p_price
    ORDER BY t.due_date;
END;
$$;


--
-- Name: get_top_earning_users(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_top_earning_users(p_limit integer) RETURNS TABLE(user_id integer, full_name character varying, total_earnings integer, avg_rating numeric)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY 
    SELECT
        u.app_user_id, 
        u.full_name, 
        COALESCE(SUM(t.price), 0)::INTEGER AS total_earnings,
        COALESCE(AVG(r.stars), 0) AS avg_rating
    FROM app_user u
    LEFT JOIN answer a ON u.app_user_id = a.app_user_id
    LEFT JOIN task t ON a.task_id = t.task_id
    LEFT JOIN review r ON u.app_user_id = r.for_app_user_id
	left join answer_app_user au on au.answer_id = a.answer_id
    WHERE au.paid = TRUE and au.confirmed = TRUE
    GROUP BY u.app_user_id, u.full_name
    ORDER BY total_earnings DESC
    LIMIT p_limit;
END;
$$;


--
-- Name: get_users_with_unresolved_feedback_in_category(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_users_with_unresolved_feedback_in_category() RETURNS TABLE(user_id integer, full_name character varying, unresolved_feedback_count integer)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.app_user_id,
        u.full_name,
        COUNT(f.feedback_id)::INTEGER AS unresolved_feedback_count
    FROM app_user u
    JOIN feedback f ON u.app_user_id = f.app_user_id
    WHERE f.is_resolved = FALSE
    GROUP BY u.app_user_id, u.full_name
    ORDER BY unresolved_feedback_count DESC;
END;
$$;


--
-- Name: register(character varying, character varying, character varying, character varying); Type: PROCEDURE; Schema: public; Owner: -
--

CREATE PROCEDURE public.register(IN p_full_name character varying, IN p_email character varying, IN p_password character varying, IN p_username character varying DEFAULT NULL::character varying)
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM app_user WHERE email = p_email) THEN
        RAISE EXCEPTION 'Email % is already taken.', p_email
		USING ERRCODE = 'P0001';
    END IF;
    
    IF p_username IS NOT NULL AND EXISTS (SELECT 1 FROM app_user WHERE username = p_username) THEN
        RAISE EXCEPTION 'Username % is already taken.', p_username
		USING ERRCODE = 'P0002';
    END IF;
    
    INSERT INTO app_user (full_name, email, password, username, is_admin, created_date)
    VALUES (p_full_name, p_email, p_password, p_username, FALSE, CURRENT_DATE);
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: answer; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.answer (
    answer_id integer NOT NULL,
    title character varying(50) NOT NULL,
    full_answer character varying(600),
    preview character varying(300),
    updated_date date,
    created_date date DEFAULT CURRENT_DATE NOT NULL,
    task_id integer NOT NULL,
    app_user_id integer NOT NULL
);


--
-- Name: answer_answer_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.answer_answer_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: answer_answer_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.answer_answer_id_seq OWNED BY public.answer.answer_id;


--
-- Name: answer_app_user; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.answer_app_user (
    answer_id integer NOT NULL,
    app_user_id integer NOT NULL,
    paid boolean DEFAULT false NOT NULL,
    confirmed boolean DEFAULT false NOT NULL
);


--
-- Name: app_user; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_user (
    app_user_id integer NOT NULL,
    full_name character varying(50) NOT NULL,
    email character varying(50) NOT NULL,
    password character varying(100) NOT NULL,
    username character varying(100),
    is_admin boolean DEFAULT false NOT NULL,
    created_date date DEFAULT CURRENT_DATE NOT NULL
);


--
-- Name: app_user_app_user_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.app_user_app_user_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: app_user_app_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.app_user_app_user_id_seq OWNED BY public.app_user.app_user_id;


--
-- Name: app_user_with_average_rating; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.app_user_with_average_rating AS
SELECT
    NULL::integer AS app_user_id,
    NULL::character varying(50) AS full_name,
    NULL::character varying(50) AS email,
    NULL::character varying(100) AS password,
    NULL::character varying(100) AS username,
    NULL::boolean AS is_admin,
    NULL::date AS created_date,
    NULL::numeric AS average_rating;


--
-- Name: category; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.category (
    category_id integer NOT NULL,
    name character varying(50) NOT NULL,
    parent_category_id integer
);


--
-- Name: category_category_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.category_category_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: category_category_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.category_category_id_seq OWNED BY public.category.category_id;


--
-- Name: document; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document (
    document_id integer NOT NULL,
    filename character varying(50) NOT NULL,
    answer_id integer NOT NULL,
    is_preview boolean DEFAULT false NOT NULL
);


--
-- Name: document_document_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.document_document_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: document_document_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.document_document_id_seq OWNED BY public.document.document_id;


--
-- Name: feedback; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feedback (
    feedback_id integer NOT NULL,
    message character varying(300) NOT NULL,
    is_resolved boolean DEFAULT false NOT NULL,
    created_date date DEFAULT CURRENT_DATE NOT NULL,
    app_user_id integer NOT NULL
);


--
-- Name: feedback_feedback_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.feedback_feedback_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: feedback_feedback_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.feedback_feedback_id_seq OWNED BY public.feedback.feedback_id;


--
-- Name: payment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment (
    payment_id integer NOT NULL,
    state character varying(50) NOT NULL,
    paid_date date DEFAULT now() NOT NULL,
    pay_to_date date,
    payment_uid character varying(200) NOT NULL,
    admin_payment boolean DEFAULT false NOT NULL,
    created_date date DEFAULT CURRENT_DATE NOT NULL,
    app_user_id integer NOT NULL,
    product_id integer NOT NULL
);


--
-- Name: payment_payment_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payment_payment_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payment_payment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payment_payment_id_seq OWNED BY public.payment.payment_id;


--
-- Name: product; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product (
    product_id integer NOT NULL,
    name character varying(50) NOT NULL,
    price integer NOT NULL,
    answer_limit integer NOT NULL,
    active boolean DEFAULT true NOT NULL
);


--
-- Name: product_app_user; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_app_user (
    product_id integer NOT NULL,
    app_user_id integer NOT NULL,
    answered integer DEFAULT 0 NOT NULL,
    product_app_user_id integer NOT NULL
);


--
-- Name: product_app_user_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.product_app_user_id_seq
    START WITH 0
    INCREMENT BY 1
    MINVALUE 0
    NO MAXVALUE
    CACHE 1;


--
-- Name: product_app_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.product_app_user_id_seq OWNED BY public.product_app_user.product_app_user_id;


--
-- Name: product_product_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.product_product_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: product_product_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.product_product_id_seq OWNED BY public.product.product_id;


--
-- Name: review; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.review (
    review_id integer NOT NULL,
    stars numeric NOT NULL,
    text character varying(400),
    created_date date DEFAULT CURRENT_DATE NOT NULL,
    app_user_id integer NOT NULL,
    for_app_user_id integer NOT NULL,
    CONSTRAINT review_stars_check CHECK (((stars >= (1)::numeric) AND (stars <= (5)::numeric)))
);


--
-- Name: review_review_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.review_review_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: review_review_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.review_review_id_seq OWNED BY public.review.review_id;


--
-- Name: review_with_users; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.review_with_users AS
 SELECT r.review_id,
    r.text,
    r.app_user_id,
    u.email,
    uu.email AS for_user_email,
    r.stars
   FROM ((public.review r
     LEFT JOIN public.app_user u ON ((u.app_user_id = r.app_user_id)))
     LEFT JOIN public.app_user uu ON ((uu.app_user_id = r.for_app_user_id)));


--
-- Name: task; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task (
    task_id integer NOT NULL,
    title character varying(50) NOT NULL,
    price integer NOT NULL,
    description character varying(300),
    status character varying(50) NOT NULL,
    due_date date,
    created_date date DEFAULT CURRENT_DATE NOT NULL,
    app_user_id integer NOT NULL,
    category_id integer
);


--
-- Name: task_by_user_view; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.task_by_user_view AS
SELECT
    NULL::integer AS task_id,
    NULL::character varying(50) AS title,
    NULL::integer AS price,
    NULL::character varying(300) AS description,
    NULL::character varying(50) AS status,
    NULL::date AS due_date,
    NULL::date AS created_date,
    NULL::integer AS app_user_id,
    NULL::integer AS category_id,
    NULL::character varying(50) AS app_user_email,
    NULL::json AS category_hierarchy;


--
-- Name: task_task_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.task_task_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: task_task_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.task_task_id_seq OWNED BY public.task.task_id;


--
-- Name: answer answer_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.answer ALTER COLUMN answer_id SET DEFAULT nextval('public.answer_answer_id_seq'::regclass);


--
-- Name: app_user app_user_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_user ALTER COLUMN app_user_id SET DEFAULT nextval('public.app_user_app_user_id_seq'::regclass);


--
-- Name: category category_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.category ALTER COLUMN category_id SET DEFAULT nextval('public.category_category_id_seq'::regclass);


--
-- Name: document document_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document ALTER COLUMN document_id SET DEFAULT nextval('public.document_document_id_seq'::regclass);


--
-- Name: feedback feedback_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback ALTER COLUMN feedback_id SET DEFAULT nextval('public.feedback_feedback_id_seq'::regclass);


--
-- Name: payment payment_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment ALTER COLUMN payment_id SET DEFAULT nextval('public.payment_payment_id_seq'::regclass);


--
-- Name: product product_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product ALTER COLUMN product_id SET DEFAULT nextval('public.product_product_id_seq'::regclass);


--
-- Name: product_app_user product_app_user_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_app_user ALTER COLUMN product_app_user_id SET DEFAULT nextval('public.product_app_user_id_seq'::regclass);


--
-- Name: review review_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review ALTER COLUMN review_id SET DEFAULT nextval('public.review_review_id_seq'::regclass);


--
-- Name: task task_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task ALTER COLUMN task_id SET DEFAULT nextval('public.task_task_id_seq'::regclass);


--
-- Name: answer answer_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.answer
    ADD CONSTRAINT answer_pkey PRIMARY KEY (answer_id);


--
-- Name: app_user app_user_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_user
    ADD CONSTRAINT app_user_email_key UNIQUE (email);


--
-- Name: app_user app_user_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_user
    ADD CONSTRAINT app_user_pkey PRIMARY KEY (app_user_id);


--
-- Name: category category_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.category
    ADD CONSTRAINT category_name_key UNIQUE (name);


--
-- Name: category category_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.category
    ADD CONSTRAINT category_pkey PRIMARY KEY (category_id);


--
-- Name: document document_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document
    ADD CONSTRAINT document_pkey PRIMARY KEY (document_id);


--
-- Name: feedback feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback
    ADD CONSTRAINT feedback_pkey PRIMARY KEY (feedback_id);


--
-- Name: payment payment_payment_uid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment
    ADD CONSTRAINT payment_payment_uid_key UNIQUE (payment_uid);


--
-- Name: payment payment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment
    ADD CONSTRAINT payment_pkey PRIMARY KEY (payment_id);


--
-- Name: product_app_user product_app_user_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_app_user
    ADD CONSTRAINT product_app_user_pkey PRIMARY KEY (product_app_user_id);


--
-- Name: product product_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product
    ADD CONSTRAINT product_pkey PRIMARY KEY (product_id);


--
-- Name: review review_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review
    ADD CONSTRAINT review_pkey PRIMARY KEY (review_id);


--
-- Name: task task_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task
    ADD CONSTRAINT task_pkey PRIMARY KEY (task_id);


--
-- Name: idx_answer_app_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_answer_app_user_id ON public.answer USING btree (app_user_id);


--
-- Name: idx_answer_task_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_answer_task_id ON public.answer USING btree (task_id);


--
-- Name: task_by_user_view _RETURN; Type: RULE; Schema: public; Owner: -
--

CREATE OR REPLACE VIEW public.task_by_user_view AS
 SELECT t.task_id,
    t.title,
    t.price,
    t.description,
    t.status,
    t.due_date,
    t.created_date,
    t.app_user_id,
    t.category_id,
    u.email AS app_user_email,
    json_agg(json_build_object('category_id', c.category_id, 'name', c.name, 'parent_category_id', c.parent_category_id)) AS category_hierarchy
   FROM ((public.task t
     LEFT JOIN LATERAL ( WITH RECURSIVE categories AS (
                 SELECT category.category_id,
                    category.name,
                    category.parent_category_id
                   FROM public.category
                  WHERE (category.category_id = t.category_id)
                UNION ALL
                 SELECT c_1.category_id,
                    c_1.name,
                    c_1.parent_category_id
                   FROM (public.category c_1
                     JOIN categories pc ON ((c_1.category_id = pc.parent_category_id)))
                )
         SELECT categories.category_id,
            categories.name,
            categories.parent_category_id
           FROM categories) c ON (true))
     LEFT JOIN public.app_user u ON ((t.app_user_id = u.app_user_id)))
  GROUP BY t.task_id, u.email
  ORDER BY t.created_date DESC;


--
-- Name: app_user_with_average_rating _RETURN; Type: RULE; Schema: public; Owner: -
--

CREATE OR REPLACE VIEW public.app_user_with_average_rating AS
 SELECT u.app_user_id,
    u.full_name,
    u.email,
    u.password,
    u.username,
    u.is_admin,
    u.created_date,
    avg(r.stars) AS average_rating
   FROM (public.app_user u
     LEFT JOIN public.review r ON ((r.for_app_user_id = u.app_user_id)))
  GROUP BY u.app_user_id;


--
-- Name: task trg_delete_answers_with_task; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_delete_answers_with_task AFTER DELETE ON public.task FOR EACH ROW EXECUTE FUNCTION public.delete_answers_for_task();


--
-- Name: payment trg_generate_payment_uid; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_generate_payment_uid BEFORE INSERT ON public.payment FOR EACH ROW EXECUTE FUNCTION public.generate_payment_uid();


--
-- Name: answer answer_task_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.answer
    ADD CONSTRAINT answer_task_fk FOREIGN KEY (task_id) REFERENCES public.task(task_id);


--
-- Name: answer answer_user_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.answer
    ADD CONSTRAINT answer_user_fk FOREIGN KEY (app_user_id) REFERENCES public.app_user(app_user_id);


--
-- Name: document document_answer_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document
    ADD CONSTRAINT document_answer_fk FOREIGN KEY (answer_id) REFERENCES public.answer(answer_id);


--
-- Name: feedback feedback_user_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback
    ADD CONSTRAINT feedback_user_fk FOREIGN KEY (app_user_id) REFERENCES public.app_user(app_user_id);


--
-- Name: payment payment_product_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment
    ADD CONSTRAINT payment_product_fk FOREIGN KEY (product_id) REFERENCES public.product(product_id);


--
-- Name: payment payment_user_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment
    ADD CONSTRAINT payment_user_fk FOREIGN KEY (app_user_id) REFERENCES public.app_user(app_user_id);


--
-- Name: review review_user_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review
    ADD CONSTRAINT review_user_fk FOREIGN KEY (app_user_id) REFERENCES public.app_user(app_user_id);


--
-- Name: review review_user_fk1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review
    ADD CONSTRAINT review_user_fk1 FOREIGN KEY (for_app_user_id) REFERENCES public.app_user(app_user_id);


--
-- Name: task task_user_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task
    ADD CONSTRAINT task_user_fk FOREIGN KEY (app_user_id) REFERENCES public.app_user(app_user_id);


--
-- PostgreSQL database dump complete
--

