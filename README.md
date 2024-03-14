# Installation

- [NodeJS](https://nodejs.org/en/download/) for the Frontend
- [Rust](https://www.Rust-lang.org/tools/install) for the Backend
- [Docker](https://docs.docker.com/get-docker/) for the Database
---
# Setup & Configuration

## Get the [most recent dataset](https://drive.google.com/drive/folders/16q1k2IjYKrYIaoy7mEIl_zCZEDib-QCO?usp=sharing) as CSV files
(In order to separate data & code, the dataset is not part of this repository and must be added locally)

## Frontend Setup: 
### 1. Install all dependencies
Navigate to the React project (`/gruppe-2/website`)
```
npm i
```
---
## Backend Setup 
### 1. Run postgres container

```
docker pull postgres
docker run --name local-postgres -p 5455:5432 -e POSTGRES_USER=root -e POSTGRES_PASSWORD=password -d postgres
```

### 2. Configure environment variables or `.env` file
Set the database origin. For local db use `DATABASE_URL="postgresql://root:password@localhost:5455/db"` as an [environment variable](https://www.howtogeek.com/787217/how-to-edit-environment-variables-on-windows-10-or-11/).
If you are using an `.env` file, place it in `/server/prisma/`

### 3. Generate and push database schemas
Navigate to the Rust project (`/gruppe-2/server`)
```
cargo prisma generate 
cargo prisma db push 
``` 

### 4. Download and place data in data folder 
Place downloaded files in `/server/data/` and rename them to `edges.csv` and `nodes.csv` respectively

### 5. Load data into postgres
Navigate to the Rust project (`/gruppe-2/server`)
``` 
cargo loadcsv 
``` 
If there are any errors, check the `DATABASE_URL` environment variable, `.env` file, database container, and the data file locations / names

---
## Running the application

### 1. Start the database 
``` 
docker start local-postgres
``` 

### 2. Start the API server
Navigate to the Rust project (`/gruppe-2/server`)
``` 
cargo server
```

### 3. Start the React App
Navigate to the React project (`/gruppe-2/website`)

a) in development mode with hot reload
``` 
npm start
```
### OR
b) as production build for realistic performance
``` 
tsc && vite build 
vite preview
```

### 4. The Application is now available at http://localhost:8080 (or the next available port)
