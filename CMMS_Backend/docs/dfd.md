# Data Flow Diagram (DFD) - CMMS System

This diagram (Level 1) illustrates the flow of data between the external entities and the internal processes of the CMMS.

```mermaid
graph TD
    %% External Entities
    Requester((Requester))
    Technician((Technician))
    Admin((Administrator))

    %% Processes
    P1[Auth & User Management]
    P2[Maintenance Request Process]
    P3[Work Order Management]
    P4[Asset & Inventory Control]
    P5[Reporting & Analytics]

    %% Data Stores
    DB[(PostgreSQL Database)]
    FS[(File System - Uploads)]

    %% Data Flows - Requester
    Requester -->|Credentials| P1
    P1 -->|Auth Token| Requester
    Requester -->|Request Details / Image| P2
    P2 -->|Image File| FS
    P2 -->|Request Data| DB
    DB -->|Request Status| P2
    P2 -->|Status Notification| Requester

    %% Data Flows - Technician
    Technician -->|Task Updates / Comments| P3
    P3 -->|Work Order Data| DB
    DB -->|Assigned Tasks| P3
    P3 -->|Task List| Technician
    Technician -->|Meter Readings| P4
    P4 -->|Reading Data| DB

    %% Data Flows - Admin / Planner
    Admin -->|User Config / Asset Data| P1
    Admin -->|Asset & Site Data| P4
    P4 -->|Inventory / Asset Info| DB
    DB -->|System Logs / Reports| P5
    P5 -->|Dashboard Metrics| Admin
    Admin -->|Assignment / Scheduling| P3

    %% Flow between processes
    P2 -->|Validation| P3
    P3 -->|Resource Req| P4
```

## Data Flow Descriptions
1. **User Authentication**: Credentials flow from the user to the Auth process, which verifies against the Database and returns an Auth Token.
2. **Request Submission**: Requesters send issue descriptions and images. Images are stored in the File System, while metadata is stored in the Database.
3. **Work Order Execution**: Technicians receive task details from the database, perform maintenance, and send status updates and part usage data back to the database.
4. **Asset & Inventory Management**: Admins and Planners update asset registries and inventory levels in the database.
5. **Reporting**: The system pulls historical data from the database to generate dashboard metrics for administrators.
