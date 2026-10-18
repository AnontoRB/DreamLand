# Dreamland - Digital Land Record & Verification Platform

**Dreamland** is an end-to-end digital land record and verification platform designed to prevent land fraud, simplify real estate due diligence, and provide a transparent hub for property management. Developed by **Team Procrastinators**, the system allows users to verify ownership, check pending litigation, compute land taxes, and explore interactive plot boundaries before buying or leasing land.

---

## Key Features

- **GeoID Generation**: Assigns an 8-character unique alphanumeric identifier to every plot based on GPS coordinates and grid mapping.
- **Interactive Land Mapping**: Visualizes plot boundaries, ownership details, and spatial information powered by Leaflet and OpenStreetMap.
- **Litigation & Dispute Tracker**: Instant lookup of court cases and legal disputes linked to specific plots to prevent fraudulent sales.
- **Land Tax Calculator & Management**: Displays clear tax estimates, current balances, and payment histories.
- **Lease & Settlement Records**: Access structured data on land leases and government-allocated settlements.
- **Apply for Unique ID**: Allows landowners to submit claims and register their plots for official unique ID assignment.

---

## Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Mapping & GIS**: Leaflet.js, OpenStreetMap API
- **Styling**: Tailwind CSS / Modern Responsive CSS
- **Icons**: FontAwesome / Feather Icons

---

## Getting Started

### Prerequisites

To run this project locally, all you need is a modern web browser.

### Installation & Local Setup

1. **Clone the Repository**
   ```bash
   git clone https://github.com/your-username/dreamland.git
   ```

2. **Navigate to the Project Directory**
   ```bash
   cd dreamland
   ```

3. **Launch the Application**
   - Open `index.html` directly in your browser, or
   - Use a local development server like VS Code's **Live Server** extension:
     ```bash
     npx serve .
     ```

---

## Project Structure

```text
dreamland/
├── index.html            # Main web page application
├── README.md             # Project documentation
├── css/                  # Custom stylesheets
├── js/                   # JavaScript logic (Maps, Search, Tax Calculator)
└── assets/               # Images, icons, and static assets
```

---

## Contributing

Contributions are welcome! If you'd like to improve the platform or add new features, please follow these steps:

1. **Fork** the project.
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the Branch (`git push origin feature/AmazingFeature`).
5. Open a **Pull Request**.

---

## Team

Developed with ❤️ by **Team Procrastinators**.

---

## License

This project is open-source and available under the [MIT License](LICENSE).