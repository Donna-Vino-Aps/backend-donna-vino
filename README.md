
```markdown
# Donna Vino Backend Server

This repository contains the backend server for the Donna Vino e-commerce platform. The server is built with **Node.js** and **Express** and includes features for authentication, database management, and more.

---

## Features

- **Authentication**: Utilizes **JSON Web Tokens (JWT)** for secure user authentication.
- **Cookies and CORS**: Implements cookie parsing and Cross-Origin Resource Sharing (CORS) for seamless client-server communication.
- **Testing**: Comprehensive test coverage with **Jest** for unit and integration tests.
- **Linting and Code Formatting**: Ensures consistent code style with **ESLint** and **Prettier**.

---

## Getting Started

### Prerequisites

Ensure you have the following installed on your machine:

- **Node.js** (v16 or later)
- **npm** (comes with Node.js)

### Installation
```
1. Clone the repository:

   ```bash
   git clone https://github.com/Donna-Vino-Aps/backend-donna-vino.git
   ```

2. Install dependencies:

   ```bash
   npm run setup
   ```

---

## Running the Server

To start the server, run:

```bash
npm run start
```

For development with live reloading, use:

```bash
npm run dev
```

---

## Testing

This project uses **Jest** for testing. Here’s how you can run the tests:

- Run all tests:

  ```bash
  npm run test
  ```

- Run tests in watch mode:

  ```bash
  npm run test:watch
  ```

- Run a specific test file in watch mode:

  ```bash
  npm run test -- path/to/test/file.test.js
  ```

- Check test coverage:

  ```bash
  npm run test:coverage
  ```

---

## Code Quality Tools

### Prettier

- To check code formatting:

  ```bash
  npm run prettier
  ```

- To automatically fix formatting issues:

  ```bash
  npm run prettier:fix
  ```

### ESLint

- To check for linting errors:

  ```bash
  npm run lint
  ```

- To automatically fix linting issues:

  ```bash
  npm run lint:fix
  ```

---

## Pre-Commit and Pre-Push Hooks

This project uses **husky** to run checks before committing or pushing code:

- **Pre-commit**: Runs linting and code formatting checks.
- **Pre-push**: Ensures all tests pass before code is pushed to the repository.

These hooks are automatically enabled after running `npm install`.

---

## Contributing

We welcome contributions! Please follow the established linting and formatting rules and ensure all tests pass before submitting a pull request.

---

## License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.
```

