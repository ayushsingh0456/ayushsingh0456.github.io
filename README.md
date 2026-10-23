# Ayush Kumar Singh · Portfolio

Business Analyst & Product Owner working on SaaS, web and mobile products: requirements management, solution design and Agile delivery.

**Live site:** [ayushsingh0456.github.io](https://ayushsingh0456.github.io) · [LinkedIn](https://www.linkedin.com/in/ayush-singh-914495189/) · [GitHub](https://github.com/ayushsingh0456)

## Projects on the site

| Project | Type | Links |
|---|---|---|
| US Home-Care Operations Platform | Client work, web and mobile SaaS | [Case study](https://ayushsingh0456.github.io/case-studies/tendwell.html) · [Repository](https://github.com/ayushsingh0456/us-home-care-operations-platform) |
| AI Financial Statements & Valuation SaaS | Client work, under NDA | Summary on the home page |
| Multi-Branch Restaurant Ordering & POS Platform | Client work | [Case study](https://ayushsingh0456.github.io/case-studies/brasa.html) · [Repository](https://github.com/ayushsingh0456/multi-branch-restaurant-ordering-pos-platform) |
| Local Commerce & Booking Platform | Client work | [Case study](https://ayushsingh0456.github.io/case-studies/quartier.html) · [Repository](https://github.com/ayushsingh0456/local-commerce-booking-platform) |
| Mneme: AI operational workspace | Own product, prototype | [Case study](https://ayushsingh0456.github.io/case-studies/mneme.html) · [Repository](https://github.com/ayushsingh0456/context-hub) |
| Bunny: a shared planner for two | Own product, live | [Case study](https://ayushsingh0456.github.io/case-studies/bunny.html) · [Live app](https://bunny-planner.vercel.app) |

For the client projects, client details are withheld and names and data are changed. The three public repositories hold the full BA document sets (BRD, SRS, business rules, user stories, OpenAPI, test cases, UAT and incident reviews), and the site's [document library](https://ayushsingh0456.github.io/library.html) opens them in the browser with diagrams rendered.

## How the site is built

Static HTML, CSS and vanilla JavaScript on GitHub Pages, with no build step. The document library fetches Markdown, CSV and OpenAPI files from the public repositories and renders them with marked, Mermaid and js-yaml, which load from jsDelivr only when a document is opened.

```
index.html          Home: intro, projects, about, experience, contact
library.html        Document library for the three case-study repositories
case-studies/       One page per project
css/  js/  assets/  Styles, scripts, images, wireframes and PDFs
```

To preview locally, run `python3 -m http.server` in this folder and open http://localhost:8000.
