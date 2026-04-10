# Use Case Diagram - CMMS System

This diagram illustrates the primary actors and their interactions with the Computerized Maintenance Management System (CMMS).

```mermaid
useCaseDiagram
    actor "Requester" as R
    actor "Technician" as T
    actor "Planner" as P
    actor "Admin" as A

    package "Maintenance Management" {
        usecase "Create Maintenance Request" as UC1
        usecase "Track Request Status" as UC2
        usecase "Add Comments to Request" as UC3
        usecase "Assign Technician" as UC4
        usecase "Create Work Order" as UC5
        usecase "Update Work Order Status" as UC6
        usecase "Log Parts Usage" as UC7
    }

    package "Asset & Inventory" {
        usecase "Manage Assets" as UC8
        usecase "Track Meter Readings" as UC9
        usecase "Manage Inventory" as UC10
        usecase "Manage Suppliers" as UC11
        usecase "Generate Purchase Orders" as UC12
    }

    package "Administration" {
        usecase "User Management" as UC13
        usecase "View Audit Logs" as UC14
        usecase "Manage Roles/Permissions" as UC15
    }

    R --> UC1
    R --> UC2
    R --> UC3

    T --> UC2
    T --> UC3
    T --> UC6
    T --> UC7
    T --> UC9

    P --> UC4
    P --> UC5
    P --> UC8
    P --> UC10
    P --> UC11
    P --> UC12

    A --> UC13
    A --> UC14
    A --> UC15
    A --> UC8
```

## Actors Description
- **Requester**: Staff members who identify and report maintenance needs.
- **Technician**: Maintenance staff who execute repair and maintenance tasks.
- **Planner**: Managers who schedule tasks, manage assets, and oversee inventory.
- **Admin**: System administrators responsible for user access and system configuration.
