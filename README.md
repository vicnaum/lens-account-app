# Lens Account Web Interface

This project is a web application designed to provide an interface for interacting with a custom EVM Smart Account, specifically the "Lens Account". It allows the account owner to connect their controlling EOA wallet, view basic account information, and interact with external dApps _through_ the Lens Account using WalletConnect v2 via Reown WalletKit.

This is the Minimum Viable Product (MVP) focusing on core functionality as outlined in the project specifications.

## Tech Stack

- **Framework:** Next.js 15+ (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Package Manager:** pnpm
- **Core Web3 Libraries:**
  - Wagmi
  - Viem
  - ConnectKit
  - @reown/walletkit (for WalletConnect v2 Wallet functionality)
  - @tanstack/react-query (peer dependency for Wagmi)

## Prerequisites

- Node.js (v18.17 or later recommended)
- pnpm

## Getting Started

1.  **Clone the repository (if applicable):**

    ```bash
    git clone <repository-url>
    cd lens-account-interface
    ```

2.  **Install dependencies:**

    ```bash
    pnpm install
    ```

3.  **Set up Environment Variables:**
    Create a `.env.local` file in the root of the project. You **must** obtain a Project ID from [WalletConnect Cloud](https://cloud.walletconnect.com/).

    ```plaintext [.env.local]
    # Get your ID from https://cloud.walletconnect.com/
    NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=YOUR_WALLETCONNECT_PROJECT_ID_HERE
    ```

    Replace `YOUR_WALLETCONNECT_PROJECT_ID_HERE` with your actual Project ID.

4.  **Run the development server:**
    ```bash
    pnpm dev
    ```
    Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Available Scripts

In the project directory, you can run:

- `pnpm dev`: Runs the app in development mode. Open [http://localhost:3000](http://localhost:3000).
- `pnpm build`: Builds the app for production.
- `pnpm start`: Starts the production server.
- `pnpm lint`: Runs ESLint.

## Project Structure

The project uses the Next.js App Router. Key directories will include:

- `app/`: Contains application routes and layouts.
- `components/`: Reusable React components.
- `contexts/`: React Context providers for managing shared state.
- `hooks/`: Custom React Hooks for specific logic.
- `lib/`: Configuration files (Wagmi, constants) and utility functions.
- `services/`: Abstraction layers for external SDKs (e.g., Reown WalletKit).
- `styles/`: Global styles and Tailwind configuration.

_(Refer to the Technical Specification for a more detailed proposed structure)._

## Contributing

_(Placeholder: Add contribution guidelines here when applicable)._

## License

_(Placeholder: Add license information here when applicable)._
