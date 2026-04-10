# UML Class Diagram - CMMS System

This diagram represents the logical structure of the CMMS application, showing the main entities and their relationships.

```mermaid
classDiagram
    class User {
        +Int id
        +String full_name
        +String email
        +String role
        +login()
        +updateProfile()
    }

    class Asset {
        +Int id
        +String asset_code
        +String asset_name
        +Int criticality
        +updateStatus()
    }

    class MaintenanceRequest {
        +Int id
        +String request_code
        +String status
        +DateTime requested_at
        +create()
        +assign()
    }

    class WorkOrder {
        +Int id
        +String wo_number
        +String title
        +DateTime scheduled_start
        +complete()
    }

    class Part {
        +Int id
        +String part_number
        +String name
        +Float unit_price
    }

    class Inventory {
        +Int id
        +Float qty_on_hand
        +Float min_qty
    }

    class Supplier {
        +Int id
        +String name
        +String email
    }

    User "1" -- "0..*" MaintenanceRequest : requests
    User "1" -- "0..*" MaintenanceRequest : assigned_to
    Asset "1" -- "0..*" MaintenanceRequest : has
    MaintenanceRequest "1" -- "0..1" WorkOrder : generates
    WorkOrder "1" -- "0..*" Part : uses
    Part "1" -- "1" Inventory : tracked_in
    Supplier "1" -- "0..*" Part : supplies
    Asset "1" -- "0..*" WorkOrder : maintenance_on
```

## Description of Entities
- **User**: Represents system users with specific roles (Admin, Technician, etc.).
- **Asset**: The equipment or machinery being maintained.
- **MaintenanceRequest**: An initial request for maintenance work.
- **WorkOrder**: A formalized task or set of tasks for maintenance.
- **Part**: Replacement parts or consumables used in maintenance.
- **Inventory**: Storage and quantity tracking for parts.
- **Supplier**: Vendors providing parts and services.
