# Multi-Agent Customer Support Chatbot 🤖

This project is a **multi-agent customer support chatbot** designed to handle both **conversational queries** and **transactional tasks** like hotel and flight bookings.  

Unlike a traditional single-agent chatbot, this system leverages a **Supervisor Agent** to decide how to handle user queries:  
- 🗨️ **Normal conversation** – handled directly by the Supervisor  
- 🏨 **Hotel booking request** – routed to the **Hotels Booking Agent**  
- ✈️ **Flight booking request** – routed to the **Flights Booking Agent**  

Each booking agent is integrated with dedicated tools – **BookHotel** and **BookFlight** – ensuring task completion with reliability.  

---

## 🛠️ Architecture Overview

```mermaid
flowchart TD
    A[Start] --> B[Supervisor]
    B -->|Normal Conversation| C[End]
    B -->|Hotel Booking| D[Hotels Booking Agent]
    B -->|Flight Booking| E[Flights Booking Agent]
    D --> F[Hotel Booking Tools] --> G[Book Hotel]
    E --> H[Flight Booking Tools] --> I[Book Flight]
    D --> C
    E --> C
