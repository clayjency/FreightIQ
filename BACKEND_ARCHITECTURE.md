# FreightIQ Backend Architecture

## Current Backend Structure

Our backend is currently structured as a lightweight Python web application (likely using FastAPI given the `routers` directory convention). It follows a modular structure where different concerns are separated into distinct files and directories:

- **Entry Point (`backend/main.py`)**: The main application initialization and routing hub.
- **Authentication (`backend/auth.py`)**: Handles user authentication, password hashing, and token generation.
- **Routing (`backend/routers/`)**: Contains separate API route definitions for modularity.
- **Models (`backend/models/`)**: Contains data schemas (likely Pydantic models for API validation).
- **Database Layer (`backend/database.py`)**: Manages database connections and executes queries.
- **Natural Language Querying (`backend/nlq/`)**: Handles advanced natural language processing features for the platform.

## Database Setup & Users Table Management

- **Database Type**: SQLite (a file-based, serverless relational database).
- **File Location**: The database is stored locally in a single file at the root of the project: `freightiq_data.db`.
- **ORM / Query Builder**: We are **not** using an ORM (like SQLAlchemy or Django ORM). Instead, we are using the built-in Python `sqlite3` driver to execute **raw SQL queries**.
- **Users Table Creation**: The `users` table is created and managed directly inside `backend/database.py`. The `init_db()` function executes the following raw SQL script to create the schema:

```sql
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    hashed_password TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

Helper functions in `backend/database.py` (such as `get_user_by_username` and `create_user`) use raw SQL `SELECT` and `INSERT` statements to manage user data.

---

## Architectural Analysis: Current Setup vs. MongoDB

### Is our current database setup optimal for our current application requirements?
**No, the current setup is not optimal for a production-grade application.**
While SQLite with raw SQL is excellent for rapid prototyping, early-stage development, and local testing, it presents several major drawbacks as the application scales:
1. **Concurrency Limits**: SQLite struggles with high concurrent write operations since it locks the entire database file during writes.
2. **Maintenance Overhead**: Writing raw SQL queries (instead of using an ORM or query builder) makes the codebase brittle, harder to refactor, and prone to SQL injection risks if not handled perfectly.
3. **Scalability**: SQLite is not designed to be distributed across multiple servers, making it a bottleneck for horizontal scaling.

### Would switching to MongoDB be a better choice?
MongoDB (a NoSQL document database) would solve the concurrency and scalability issues of SQLite, but whether it is the *best* choice depends on the specific data access patterns of FreightIQ.

Here is a comparison of our current setup (SQLite) vs. MongoDB:

| Feature | Current Setup (SQLite + Raw SQL) | MongoDB (NoSQL) |
| :--- | :--- | :--- |
| **Scalability** | **Poor**. Limited to a single server and file. Poor write concurrency. | **Excellent**. Built for horizontal scaling across clusters (sharding). High concurrency. |
| **Schema Flexibility** | **Rigid**. Requires explicit `ALTER TABLE` migrations for any changes to user or route structures. | **Highly Flexible**. Schemaless by design. Documents can have varying structures, allowing rapid iteration of features. |
| **Query Complexity** | **Good for Relational Data**. Raw SQL allows powerful joins and aggregations, but managing them in strings is painful. | **Good for Document Data**. Aggregation pipeline is powerful, but complex multi-collection JOINs are expensive and less intuitive than SQL. |
| **Maintenance Overhead** | **High (Code level)**. Maintaining raw SQL strings without an ORM is tedious and error-prone as the schema grows. | **Low (Code level)**. Using an ODM (like Beanie or Motor) makes interacting with MongoDB from Python very developer-friendly. |
| **Transactions** | **ACID Compliant**. Good for financial or strict rate-tracking data. | **ACID Compliant (Multi-document)**. Supported in modern MongoDB, though historically less strict than SQL. |

#### Recommendation
Switching away from SQLite is highly recommended for production.
- **If FreightIQ data is highly relational** (e.g., users have many shipments, shipments have many routes, rates belong to specific carriers and routes): Switching to a robust relational database like **PostgreSQL** paired with an ORM (like **SQLAlchemy**) would likely be a better fit than MongoDB.
- **If FreightIQ data is document-heavy, unstructured, or rapidly changing** (e.g., varying cargo manifests, flexible IoT tracking data, unstructured NLP logs): **MongoDB** would be an excellent, scalable choice that significantly reduces the friction of schema migrations.
