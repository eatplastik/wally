CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, email TEXT, password TEXT, username TEXT, user_score INT);

CREATE TABLE IF NOT EXISTS user_completed (id SERIAL PRIMARY KEY, user_id INT, ctf_id INT, complete BOOLEAN);

CREATE TABLE IF NOT EXISTS ctf_list (id SERIAL PRIMARY KEY, ctf_name TEXT, ctf_points INT, ctf_category TEXT);

CREATE TABLE IF NOT EXISTS ctf_challenge (id SERIAL PRIMARY KEY, ctf_qns TEXT, ctf_ans TEXT, ctf_id INT);

CREATE TABLE IF NOT EXISTS invites (id SERIAL PRIMARY KEY, invite_code TEXT, expired BOOLEAN, user_id INT);