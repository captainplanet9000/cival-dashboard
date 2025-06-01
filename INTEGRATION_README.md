# Trading Farm Dashboard - Supabase MCP Integration

This project is a React dashboard for the Trading Farm system, integrated with the Supabase MCP (Model-Controller-Provider) server that provides agent coordination, message queuing, and cooperation features.

## Getting Started

### Prerequisites

- Node.js (v16+)
- Trading Farm Supabase MCP server running (default: http://localhost:3007)

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/trading-farm-dashboard.git
   cd trading-farm-dashboard
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Configure environment
   - Copy `.env.example` to `.env`
   - Update the Supabase connection details:
     ```
     VITE_SUPABASE_URL=http://localhost:3007
     VITE_SUPABASE_ANON_KEY=your_anonymous_key
     ```

4. Start the development server
   ```bash
   npm run dev
   ```

5. Build for production
   ```bash
   npm run build
   ```

## Features

- **Agent Management**: Register, monitor, and control agents
- **Task Coordination**: Create tasks and workflows for agents to execute
- **Message Queue**: View and manage inter-agent communications
- **Real-time Monitoring**: Track system performance and agent activities
- **Trading Dashboard**: Monitor trading signals and execution results

## Integration with Supabase MCP

This dashboard connects to the Trading Farm Supabase MCP server to:

1. Register and manage agents with the coordinator
2. Send and receive messages between agents
3. Create and monitor tasks and workflows
4. Track agent cooperation and performance
5. Visualize trading signals and market data

## Architecture

- **React**: UI framework
- **TypeScript**: Type-safe JavaScript
- **Vite**: Build tool
- **Tailwind CSS + shadcn/ui**: Styling
- **Supabase**: Backend connection
- **React Query**: Data fetching and caching
- **Recharts**: Data visualization

## Customization

The dashboard is designed to be customizable:

- Add new pages in `src/pages`
- Create new components in `src/components`
- Extend services in `src/services`
- Configure API connections in `src/integrations`

## Troubleshooting

- Ensure the Supabase MCP server is running and accessible
- Check environment variables are correctly set
- Verify API endpoints in services match your server configuration
- Check browser console for any API connection errors

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 