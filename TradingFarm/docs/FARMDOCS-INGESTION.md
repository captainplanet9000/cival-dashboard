# FARMDOCS Ingestion Workflow

## Overview

The FARMDOCS Ingestion Workflow is a system for storing, organizing, and accessing comprehensive documentation for the Trading Farm platform. It processes documents through a sophisticated pipeline that includes chunking, embedding generation, vector storage, and knowledge graph integration.

FARMDOCS (Farm Architectural Resource Management Documentation) contains crucial information about the Trading Farm's design, architecture, implementation details, and operational guidelines.

## Features

- **Document Processing**: Breaks down documents into manageable chunks for efficient storage and retrieval
- **Vector Embeddings**: Generates OpenAI embeddings for semantic search capabilities
- **Pgvector Integration**: Stores embeddings in Supabase with pgvector extension for similarity searches
- **Knowledge Graph**: Creates relationships between document sections for context-aware retrieval
- **Agent Accessibility**: Makes documentation available to trading agents through the memory system

## Components

1. **Database Schema**: Creates a `document_chunks` table with pgvector extension in Supabase
2. **Document Ingestion Service**: Processes and stores documentation with proper metadata
3. **Migration Script**: Sets up necessary database tables and functions
4. **Ingestion Script**: Runs the full ingestion workflow for FARMDOCS

## FARMDOCS Contents

The FARMDOCS consists of 5 core documents:

1. **Project Requirements Document**: Functional and non-functional requirements for the Trading Farm
2. **Tech Stack & APIs Document**: Technology stack, libraries, and external APIs used in the system
3. **App Flow Document**: Key workflows and data flows within the system
4. **Backend Structure Document**: Architecture style, database schema, and communication patterns
5. **Frontend Guidelines**: UI/UX principles, component specifications, and implementation details

## Setup

1. Add your OpenAI API key to the `.env.local` file:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   ```

2. Ensure Supabase connection is configured properly in `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

## Usage

### Running the Ingestion

To ingest FARMDOCS into the Trading Farm memory system:

```bash
npm run ingest:farmdocs
```

This will:
1. Run the migration to create the necessary database tables
2. Initialize the document ingestion service
3. Process and store the FARMDOCS documents
4. Create relationships between documents

### Accessing FARMDOCS

Trading agents can access FARMDOCS through the memory system using:

```typescript
// Search for relevant document chunks
const relevantDocs = await documentIngestionService.searchDocuments("how to implement strategy deployment");

// Or retrieve a specific document by ID
const document = await documentIngestionService.getDocumentById("document-id");
```

## Integration with Agent System

The FARMDOCS are integrated with the Trading Farm's agent system through:

1. **Memory System**: Agents can query the vector database to retrieve relevant documentation
2. **Knowledge Graph**: Relationships between documents help agents understand context
3. **RAG Implementation**: FARMDOCS serves as a knowledge base for Retrieval-Augmented Generation

## Maintenance

To update FARMDOCS:

1. Update the document content in `src/scripts/ingest-farm-docs.ts`
2. Re-run the ingestion script:
   ```bash
   npm run ingest:farmdocs
   ```

## Troubleshooting

If you encounter issues with the ingestion process:

1. Check that OpenAI API key is valid and has correct permissions
2. Ensure Supabase connection is working properly
3. Verify that pgvector extension is enabled in your Supabase project
4. Check logs for specific error messages

## Reference

- `src/data-access/services/document-ingestion-service.ts`: Main service for document ingestion
- `src/data-access/migrations/013_create_document_chunks_table.ts`: Database migration for document storage
- `src/scripts/ingest-farm-docs.ts`: Script containing FARMDOCS content and ingestion logic
- `src/scripts/run-farm-docs-ingestion.js`: Execution script for the ingestion process 