INSERT TABLE IF NOT EXISTS users (id PRIMARY SERIAL KEY, email TEXT, password TEXT, username TEXT, user_score INT);

INSERT TABLE IF NOT EXISTS user_completed (id PRIMARY SERIAL KEY, user_id INT, ctf_id INT, complete BOOLEAN);

INSERT TABLE IF NOT EXISTS ctf_list (id PRIMARY SERIAL KEY, ctf_name TEXT, ctf_points INT, ctf_category TEXT);

INSERT TABLE IF NOT EXISTS ctf_challenge (id PRIMARY SERIAL KEY, ctf_qns TEXT, ctf_ans TEXT, ctf_id INT);