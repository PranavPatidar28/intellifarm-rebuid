# Intellifarm User Flow Diagram

This diagram reflects the current implemented flow in the app.

For a hackathon-friendly presentation version, open [userflow-hackathon.html](/C:/Pranav/Development/Hackathon/Intellifarm/intellifarm-rebuid/docs/userflow-hackathon.html).

Additional presentation assets:

- [Poster-style hackathon diagram](/C:/Pranav/Development/Hackathon/Intellifarm/intellifarm-rebuid/docs/userflow-poster.html)
- [Single-slide pitch HTML](/C:/Pranav/Development/Hackathon/Intellifarm/intellifarm-rebuid/docs/userflow-pitch-slide.html)
- [Judge-friendly swimlane HTML](/C:/Pranav/Development/Hackathon/Intellifarm/intellifarm-rebuid/docs/userflow-swimlane.html)
- [Pitch slide SVG](/C:/Pranav/Development/Hackathon/Intellifarm/intellifarm-rebuid/docs/exports/userflow-pitch-slide.svg)
- [Pitch slide PNG](/C:/Pranav/Development/Hackathon/Intellifarm/intellifarm-rebuid/docs/exports/userflow-pitch-slide.png)
- [Swimlane SVG](/C:/Pranav/Development/Hackathon/Intellifarm/intellifarm-rebuid/docs/exports/userflow-swimlane.svg)
- [Swimlane PNG](/C:/Pranav/Development/Hackathon/Intellifarm/intellifarm-rebuid/docs/exports/userflow-swimlane.png)

## Overview Flow

```mermaid
flowchart TD
    A["User opens app"] --> B["/ redirects to /login"]
    B --> C["Login screen<br/>Enter phone number"]
    C --> D["Request OTP"]
    D --> E["Enter OTP"]
    E --> F["Verify OTP"]
    F --> G{"Authenticated?"}
    G -- "No" --> B
    G -- "Yes" --> H{"Profile complete?"}

    H -- "No" --> I["Onboarding: Profile<br/>Name, language, state, district, village"]
    I --> J["Onboarding: Farm / Plot<br/>Name, area, irrigation, optional GPS"]
    J --> K["Onboarding: Crop Season<br/>Plot, crop, sowing date, status"]
    K --> L["Dashboard / Today"]

    H -- "Yes" --> L

    L --> M{"Any active or saved crop season?"}
    M -- "No" --> N["Empty dashboard state"]
    N --> J
    N --> O["Fields"]

    M -- "Yes" --> P["Dashboard briefing<br/>Weather, alerts, tasks, markets, schemes"]

    P --> O["Fields"]
    P --> Q["Plan / Crop prediction"]
    P --> R["Support"]
    P --> S["Market"]
    P --> T["Profile"]

    O --> U["Field list"]
    U --> V["Field detail"]
    V --> W{"Plot has crop seasons?"}
    W -- "Yes" --> X["Season timeline"]
    W -- "No" --> Y["Create season"]
    W -- "No" --> Q
    Y --> K

    X --> X1["Update tasks"]
    X --> X2["Run weekly resource estimate"]
    X --> X3["View related schemes"]

    Q --> Q1{"Planning mode"}
    Q1 -- "Saved plot" --> Q2["Use saved field context"]
    Q1 -- "Explore new location" --> Q3["Enter state, irrigation, optional GPS"]
    Q2 --> Q4["Choose season and soil context"]
    Q3 --> Q4
    Q4 --> Q5["Run crop prediction"]
    Q5 --> Q6["Review confidence, assumptions, top crop matches"]
    Q6 --> Q7["Use this crop"]
    Q7 --> K
    Q6 --> Q8["Save soil type to plot"]

    R --> R1["Support hub"]
    R1 --> R2["Grounded assistant"]
    R1 --> R3["Disease help"]
    R1 --> R4["Schemes"]

    S --> S1["Refresh GPS or use saved farm coordinates"]
    S1 --> S2["Filter by crop"]
    S2 --> S3["Compare mandis, warehouses, and price history"]

    T --> T1["Update profile"]
    T --> T2["Upload profile photo"]
    T --> T3["Log out"]
    T3 --> B

    P --> Z{"User role = ADMIN?"}
    Z -- "Yes" --> AA["Admin console"]
    Z -- "No" --> P
```

## Support And Advisory Flows

```mermaid
flowchart TD
    A["Support hub"] --> B["Grounded assistant"]
    A --> C["Disease help"]
    A --> D["Schemes"]

    B --> B1["Open thread or start new thread"]
    B1 --> B2["Type question or use voice typing"]
    B2 --> B3["Send message"]
    B3 --> B4["Read grounded reply"]
    B4 --> B5["Review sources and safety flags"]
    B4 --> B6["Optional: read reply aloud"]

    C --> C1{"Diagnosis context"}
    C1 -- "Saved crop season" --> C2["Pick season from saved farms"]
    C1 -- "New place" --> C3["Enter one-off place label"]
    C2 --> C4["Upload normal-distance crop photo"]
    C3 --> C4
    C4 --> C5["Upload close-up symptom photo"]
    C5 --> C6["Optional: add note by text or voice"]
    C6 --> C7["Submit for diagnosis"]
    C7 --> C8["Review predicted issue, recommendation, and escalation status"]
    C8 --> C9["Open recent report history"]

    D --> D1["Filter by crop, category, or search text"]
    D1 --> D2["Browse relevant schemes"]
    D2 --> D3["Open official link"]
```

## Admin Flow

```mermaid
flowchart TD
    A["Admin logs in with OTP"] --> B{"Role = ADMIN?"}
    B -- "No" --> C["Redirect to /dashboard"]
    B -- "Yes" --> D["Open /admin"]

    D --> E["View overview metrics"]
    D --> F["Manage crop definitions"]
    D --> G["Manage crop stage rules"]
    D --> H["Manage task templates"]
    D --> I["Manage schemes"]
    D --> J["Review recent disease reports"]

    F --> F1["Create or edit crop"]
    G --> G1["Create or edit stage rule"]
    H --> H1["Create or edit task template"]
    I --> I1["Create or edit scheme"]
```
