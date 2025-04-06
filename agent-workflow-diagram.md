# Agent Workflow System Architecture and Processes

This document contains diagrams illustrating the architecture and processes of the GWDS Agent Workflow System.

## System Architecture

```mermaid
graph TD
    subgraph "User Interface"
        UI_AgentWorkflow["AgentWorkflow Component"]
        UI_Templates["WorkflowTemplates Component"]
        UI_Scheduler["WorkflowScheduler Component"]
        UI_Collaboration["AgentCollaboration Component"]
    end

    subgraph "API Layer"
        API_Workflows["/api/agents/[id]/workflows"]
        API_Templates["/api/templates"]
        API_Schedules["/api/schedules"]
        API_Collab["/api/collaborations"]
        API_CollabSteps["/api/collaborations/[id]/steps"]
        API_CollabFlows["/api/collaborations/flows"]
    end

    subgraph "Service Layer"
        SVC_AgentWorkflow["AgentWorkflowService"]
        SVC_Template["WorkflowTemplateService"]
        SVC_Schedule["WorkflowSchedulerService"]
        SVC_Collab["AgentCollaborationService"]
        SVC_LLM["LlmService"]
        SVC_MCP["McpToolsService"]
    end

    subgraph "External Services"
        EXT_LLM["Large Language Models"]
        EXT_Exchange["Exchange APIs"]
        EXT_Data["Market Data Providers"]
        EXT_DeFi["DeFi Protocols"]
    end

    %% UI to API connections
    UI_AgentWorkflow --> API_Workflows
    UI_Templates --> API_Templates
    UI_Scheduler --> API_Schedules
    UI_Collaboration --> API_Collab
    UI_Collaboration --> API_CollabSteps
    UI_Collaboration --> API_CollabFlows

    %% API to Service connections
    API_Workflows --> SVC_AgentWorkflow
    API_Templates --> SVC_Template
    API_Schedules --> SVC_Schedule
    API_Collab --> SVC_Collab
    API_CollabSteps --> SVC_Collab
    API_CollabFlows --> SVC_Collab

    %% Service interconnections
    SVC_AgentWorkflow --> SVC_LLM
    SVC_AgentWorkflow --> SVC_MCP
    SVC_AgentWorkflow --> SVC_Template
    SVC_Collab --> SVC_AgentWorkflow
    SVC_Schedule --> SVC_AgentWorkflow

    %% External service connections
    SVC_LLM --> EXT_LLM
    SVC_MCP --> EXT_Exchange
    SVC_MCP --> EXT_Data
    SVC_MCP --> EXT_DeFi

    %% Styling
    classDef ui fill:#d4f1f9,stroke:#05728f,stroke-width:2px
    classDef api fill:#ffe6cc,stroke:#d79b00,stroke-width:2px
    classDef service fill:#dae8fc,stroke:#6c8ebf,stroke-width:2px
    classDef external fill:#f8cecc,stroke:#b85450,stroke-width:2px

    class UI_AgentWorkflow,UI_Templates,UI_Scheduler,UI_Collaboration ui
    class API_Workflows,API_Templates,API_Schedules,API_Collab,API_CollabSteps,API_CollabFlows api
    class SVC_AgentWorkflow,SVC_Template,SVC_Schedule,SVC_Collab,SVC_LLM,SVC_MCP service
    class EXT_LLM,EXT_Exchange,EXT_Data,EXT_DeFi external
```

## Workflow Execution Process

```mermaid
sequenceDiagram
    participant User
    participant AgentWorkflow as AgentWorkflow Component
    participant WorkflowService as AgentWorkflowService
    participant LLMService as LlmService
    participant MCPService as McpToolsService
    participant External as External Systems

    User->>AgentWorkflow: Input natural language instruction
    AgentWorkflow->>WorkflowService: Execute workflow with input
    WorkflowService->>LLMService: Generate workflow plan
    LLMService->>External: Send prompt to LLM
    External-->>LLMService: Return structured plan
    LLMService-->>WorkflowService: Return step-by-step plan

    loop Each Step
        WorkflowService->>MCPService: Execute step (if requires MCP tool)
        MCPService->>External: Call external API
        External-->>MCPService: Return data/result
        MCPService-->>WorkflowService: Return step result
        WorkflowService->>WorkflowService: Process and store step result
    end

    WorkflowService->>LLMService: Generate result summary
    LLMService->>External: Send prompt to LLM
    External-->>LLMService: Return summary
    LLMService-->>WorkflowService: Return formatted summary
    WorkflowService-->>AgentWorkflow: Return complete workflow results
    AgentWorkflow-->>User: Display workflow results
```

## Scheduled Workflow Process

```mermaid
sequenceDiagram
    participant User
    participant SchedulerUI as WorkflowScheduler Component
    participant SchedulerService as WorkflowSchedulerService
    participant WorkflowService as AgentWorkflowService
    participant Cron as Cron Job / Scheduler

    User->>SchedulerUI: Configure scheduled workflow
    SchedulerUI->>SchedulerService: Create schedule
    SchedulerService-->>SchedulerUI: Confirm schedule creation
    SchedulerUI-->>User: Schedule created successfully

    loop At scheduled times
        Cron->>SchedulerService: Trigger due schedules check
        SchedulerService->>SchedulerService: Identify due schedules
        
        loop Each due schedule
            SchedulerService->>WorkflowService: Execute workflow
            WorkflowService-->>SchedulerService: Return workflow result
            SchedulerService->>SchedulerService: Update schedule with results
        end
    end

    User->>SchedulerUI: View schedule execution history
    SchedulerUI->>SchedulerService: Get schedule history
    SchedulerService-->>SchedulerUI: Return execution history
    SchedulerUI-->>User: Display execution history
```

## Collaboration Workflow Process

```mermaid
sequenceDiagram
    participant Initiator as Initiator Agent
    participant Reviewer as Reviewer Agent
    participant Executor as Executor Agent
    participant CollabUI as AgentCollaboration Component
    participant CollabService as AgentCollaborationService
    participant WorkflowService as AgentWorkflowService

    Initiator->>CollabUI: Create collaboration task
    CollabUI->>CollabService: Create task with assigned roles
    CollabService-->>CollabUI: Return created task
    CollabUI-->>Initiator: Task created successfully

    Initiator->>CollabUI: Start collaboration
    CollabUI->>CollabService: Start task execution
    CollabService->>CollabService: Update step 1 to IN_PROGRESS
    CollabService-->>CollabUI: Return updated task
    
    Initiator->>CollabUI: Execute first step (e.g., analysis)
    CollabUI->>CollabService: Submit step input
    CollabService->>WorkflowService: Execute workflow if needed
    WorkflowService-->>CollabService: Return workflow result
    CollabService->>CollabService: Complete step 1, start step 2
    CollabService-->>CollabUI: Return updated task status
    
    Reviewer->>CollabUI: Review analysis results
    CollabUI->>CollabService: Submit approval with notes
    CollabService->>CollabService: Complete step 2, start step 3
    CollabService-->>CollabUI: Return updated task status
    
    Executor->>CollabUI: Execute final step (e.g., trade)
    CollabUI->>CollabService: Submit execution input
    CollabService->>WorkflowService: Execute workflow
    WorkflowService-->>CollabService: Return workflow result
    CollabService->>CollabService: Complete task
    CollabService-->>CollabUI: Return completed task
    CollabUI-->>Executor: Collaboration completed successfully
```

## Template Selection and Customization

```mermaid
flowchart TD
    Start([Start]) --> SelectTemplate[Select Workflow Template]
    SelectTemplate --> ViewParams[View Template Parameters]
    ViewParams --> CustomizeParams[Customize Parameters]
    CustomizeParams --> ValidateParams{Parameters Valid?}
    ValidateParams -->|No| FixParams[Fix Invalid Parameters]
    FixParams --> ValidateParams
    ValidateParams -->|Yes| GeneratePrompt[Generate Prompt from Template]
    GeneratePrompt --> ExecuteWorkflow[Execute Workflow with Generated Prompt]
    ExecuteWorkflow --> End([End])
    
    style Start fill:#d4f1f9,stroke:#05728f,stroke-width:2px
    style End fill:#d4f1f9,stroke:#05728f,stroke-width:2px
    style ValidateParams fill:#ffe6cc,stroke:#d79b00,stroke-width:2px
    style ExecuteWorkflow fill:#dae8fc,stroke:#6c8ebf,stroke-width:2px
```

## Agent Role and Status Transitions

```mermaid
stateDiagram-v2
    [*] --> Pending: Create Collaboration
    Pending --> InProgress: Start Collaboration
    
    state InProgress {
        [*] --> InitiatorActive: Start First Step
        InitiatorActive --> ReviewerActive: Complete First Step
        ReviewerActive --> ExecutorActive: Approve Analysis
        ExecutorActive --> [*]: Complete Execution
    }
    
    InProgress --> Completed: All Steps Completed
    InProgress --> Failed: Step Execution Failed
    InProgress --> Cancelled: Manually Cancelled
    
    Completed --> [*]
    Failed --> [*]
    Cancelled --> [*]
```

## LLM Processing Flow

```mermaid
flowchart LR
    Input[User Input] --> Parsing[Parse & Extract Parameters]
    Parsing --> PromptEng[Prompt Engineering]
    PromptEng --> LLMCall[Call LLM API]
    LLMCall --> ResponseParsing[Parse LLM Response]
    ResponseParsing --> StructuredPlan[Structured Execution Plan]
    StructuredPlan --> Execution[Execute Plan Steps]
    Execution --> ResultsCollection[Collect Step Results]
    ResultsCollection --> SummaryPrompt[Create Summary Prompt]
    SummaryPrompt --> LLMSummary[Call LLM for Summary]
    LLMSummary --> FinalSummary[Final Summary]
    
    subgraph "LLM Processing"
        PromptEng
        LLMCall
        ResponseParsing
        SummaryPrompt
        LLMSummary
    end
    
    style LLM Processing fill:#f9d4f1,stroke:#8f0572,stroke-width:2px
    style Input fill:#d4f1f9,stroke:#05728f,stroke-width:2px
    style FinalSummary fill:#d4f1f9,stroke:#05728f,stroke-width:2px
```

## MCP Tool Integration Flow

```mermaid
flowchart TD
    WorkflowStep[Workflow Step] --> ToolSelection{Requires MCP Tool?}
    ToolSelection -->|No| DirectProcessing[Process Step Directly]
    ToolSelection -->|Yes| ToolPermission{Agent Has Permission?}
    
    ToolPermission -->|No| PermissionError[Return Permission Error]
    ToolPermission -->|Yes| SelectTool[Select Appropriate MCP Tool]
    
    SelectTool --> ExchangeData[Exchange Data Tool]
    SelectTool --> PriceAnalysis[Price Analysis Tool]
    SelectTool --> MarketSentiment[Market Sentiment Tool]
    SelectTool --> TradeExecution[Trade Execution Tool]
    SelectTool --> DefiSwap[DeFi Swap Tool]
    
    ExchangeData --> ParameterValidation[Validate Parameters]
    PriceAnalysis --> ParameterValidation
    MarketSentiment --> ParameterValidation
    TradeExecution --> ParameterValidation
    DefiSwap --> ParameterValidation
    
    ParameterValidation --> ExternalCall[Call External API/Service]
    ExternalCall --> ResponseProcessing[Process API Response]
    ResponseProcessing --> ReturnResult[Return Tool Result]
    
    DirectProcessing --> ReturnResult
    PermissionError --> ErrorResult[Return Error Result]
    ErrorResult --> ReturnResult
    
    ReturnResult --> NextStep[Move to Next Workflow Step]
    
    style WorkflowStep fill:#d4f1f9,stroke:#05728f,stroke-width:2px
    style NextStep fill:#d4f1f9,stroke:#05728f,stroke-width:2px
    style ToolPermission,ToolSelection fill:#ffe6cc,stroke:#d79b00,stroke-width:2px
    style ExchangeData,PriceAnalysis,MarketSentiment,TradeExecution,DefiSwap fill:#dae8fc,stroke:#6c8ebf,stroke-width:2px
    style ExternalCall fill:#f8cecc,stroke:#b85450,stroke-width:2px
``` 