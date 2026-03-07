# WAN Hardware Inventory

A comprehensive web application for managing and tracking hardware inventory.

<img width="1918" height="862" alt="image" src="https://github.com/user-attachments/assets/8d1312a2-bcb7-45db-ac0a-c5c555dd4640" />


## Description

WAN Hardware Inventory is a full-stack application designed to help organizations efficiently manage, organize, and track hardware assets across distributed network locations. The system provides user authentication, role-based access control, and a dashboard for monitoring hardware inventory and transactions.

## Tech Stack

### Frontend
- **React** - UI library
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool and development server
- **CSS** - Styling

### Backend
- **Laravel** - PHP web framework
- **PHP 8.x** - Server-side language
- **MySQL/SQLite** - Database

### Tools & Utilities
- **Node.js / npm** - Frontend dependency management
- **Composer** - PHP dependency management
- **PowerShell Scripts** - Automation and task management

## Installation

### Prerequisites
- **Node.js** (v16 or higher) - [Download](https://nodejs.org/)
- **PHP** (v8.0+) - Included in the `/php` folder
- **Composer** - PHP dependency manager
- **MySQL** or SQLite - Database

### Step 1: Install Frontend Dependencies
```bash
npm install
```

### Step 2: Install Backend Dependencies
```bash
cd backend
composer install
```

### Step 3: Set Up Environment Variables
Copy the example environment file and configure it:
```bash
cp .env.example .env
```

Update `.env` with your database credentials and API keys.

### Step 4: Generate Application Key (Laravel)
```bash
cd backend
php artisan key:generate
```

### Step 5: Run Database Migrations
```bash
cd backend
php artisan migrate
```

### Step 6: Seed the Database (Optional)
```bash
cd backend
php artisan db:seed
```

## Usage

### Development Mode

#### Using the Provided Scripts (Windows PowerShell)

Run all servers at once:
```bash
.\start_all.ps1
```

Or run individually:
```bash
# Start Vite development server (Frontend)
.\run_vite.ps1

# Start PHP development server (Backend)
.\run_php.ps1
```

#### Manual Startup

**Frontend (Vite):**
```bash
npm run dev
```
Access at: `http://localhost:5173`

**Backend (Laravel):**
```bash
cd backend
php artisan serve
```
Access at: `http://localhost:8000`

### Features
- **User Authentication** - Secure login and registration
- **Role-Based Access Control** - Different user roles with specific permissions
- **Dashboard** - Overview of hardware inventory and system status
- **Hardware Management** - Track and manage hardware assets
- **Transaction Tracking** - Monitor hardware movements and transactions
- **User Management** - Manage system users and their roles

## Database

The application uses a relational database with the following main tables:
- **users** - System users with role-based access
- **items** - Hardware inventory items
- **transactions** - Hardware movement and transaction logs

Database migrations are located in `backend/database/migrations/`.

## Configuration Files

- `vite.config.ts` - Vite frontend configuration
- `backend/vite.config.js` - Laravel Vite configuration
- `tsconfig.json` - TypeScript configuration
- `custom_php.ini` - Custom PHP configuration
- `backend/phpunit.xml` - PHPUnit test configuration

## Project Structure

```
wan-hardware-inventory/
├── src/                    # React frontend source code
│   ├── components/
│   ├── pages/             # Dashboard, Login, Users pages
│   ├── context/           # Authentication context
│   └── App.tsx
├── backend/               # Laravel application
│   ├── app/               # Application logic
│   ├── config/            # Configuration files
│   ├── database/          # Migrations and seeders
│   ├── routes/            # API routes
│   └── tests/             # PHPUnit tests
├── php/                   # PHP runtime
├── public/                # Static assets
└── package.json           # Node.js dependencies
```

## API Endpoints

The backend provides RESTful API endpoints for managing:
- Users (`/api/users`)
- Items (`/api/items`)
- Transactions (`/api/transactions`)

## License

[Specify your license here]

## Support

For questions or issues, please open an issue on GitHub or contact the development team.
