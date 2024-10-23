CREATE TABLE users (
    user_id INT AUTO_INCREMENT,
    email_address VARCHAR(50) NOT NULL UNIQUE,
	password TEXT NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phonenumber CHAR(10) UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT (NOW()),
    PRIMARY KEY (user_id)
)