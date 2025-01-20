# Donna Vino Backend

## Description

This repository contains the **backend** for **Donna Vino**, an e-commerce platform specializing in wine-related products. The backend is developed with **Node.js** and connected to a **MongoDB** database. It will support various functionalities for both the public-facing site and the **admin panel** that allows e-commerce managers to manage content.

## Key Features

- **Authentication**:

  - **Google Sign-In**: Users can log in using their Google account.
  - **Normal Login & Sign-Up**: Users can also log in or sign up with email and password.

- **Admin Panel**:

  - A control panel for e-commerce managers to add, edit, and delete products, as well as manage other store-related content.

- **Database**:

  - **MongoDB** will be used to store data related to users, products, transactions, and more.

- **Image Upload**:

  - The system will be integrated with a cloud storage service (e.g., **AWS S3** or **Cloudinary**) for managing product images.

- **Security**:

  - Security measures will be applied, including **password hashing** with **bcrypt** and **JWT (JSON Web Tokens)** for authentication.

- **Payment Integration**:
  - The system will integrate with a payment provider (e.g., **Stripe** or **PayPal**) for secure online transactions.

## Technologies

- **Node.js**: JavaScript runtime environment.
- **Express**: Web framework for Node.js.
- **MongoDB**: NoSQL database.
- **Mongoose**: ODM for MongoDB.
- **JWT**: Authentication and authorization.
- **Google OAuth**: For Google login integration.
- **bcrypt**: For password hashing.
- **Cloud Storage**: For image management (e.g., **AWS S3** or **Cloudinary**).
- **Stripe/PayPal**: For payment processing.

## Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/your-user/donna-vino-backend.git
   ```
