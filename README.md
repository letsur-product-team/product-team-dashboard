# Product Team Discovered & Delivered Dashboard

A premium, interactive dashboard for the 렛서 (Letsur) Product Team to track projects across Discovery and Delivery phases, synced with Notion as the Source of Truth.

## 🚀 Features

- **Real-time Visualization**: Tracks projects across four core categories (Shape-up, 실험, IS팀, etc.).
- **Dual-Phase Tracking**: Clearly separates "Discovery" (Planning/Ideation) and "Delivery" (Implementation/Release).
- **Team Interaction**: Filter tasks by individual team members with a sleek, interactive UI.
- **Premium Design**: Built with Next.js, Tailwind CSS, and Framer Motion for a high-end, responsive experience.
- **Notion Sync**: Direct integration with multiple Notion databases via a dedicated refresh API.

## 🛠 Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS, Lucide React (Icons)
- **Animations**: Framer Motion
- **SOT**: Notion API (@notionhq/client)
- **Deployment**: Vercel ready

## 🏃‍♂️ Getting Started

### Prerequisites

- Node.js 18.x or later
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/letsur-product-team/product-team-dashboard.git
   cd product-team-dashboard
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env.local` file in the root directory and add your Notion token:
   ```env
   NOTION_TOKEN=your_notion_integration_token_here
   ```

### Development

Run the development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Build & Operation

To create a production build:
```bash
npm run build
```

To start the production server:
```bash
npm start
```

## 🗄 Source of Truth (SOT) Rules

The dashboard follows specific mapping rules for each category:

| Category | Discovery Rule | Delivery Rule |
| :--- | :--- | :--- |
| **Shape-up** | `제안자` property | `실행자` property |
| **실험 / etc** | `Lead` (if status is Backlog/Problem Definition) | `Lead` + `Members` (if status is Archive/In progress) |
| **IS팀** | `담당자` (if status is Not Started) | `담당자` (if status is In progress/Done) |

## 📄 Documentation

For detailed context on the development process, decision-making, and audit logs, refer to:
- [work-log.md](./work-log.md): A comprehensive record of the project's evolution and data fidelity audits.

---
Developed with ❤️ by the Letsur Product Team.
