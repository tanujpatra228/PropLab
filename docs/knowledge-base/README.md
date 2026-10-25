# Knowledge Base

Long-lived knowledge behind PropLab's physics: where the reference data came from, how accurate the models are, what we learned, and why things are the way they are. The feature and guide docs explain *how* the app works; this folder explains *why*, with evidence.

**Rule:** when you change the physics, re-run `npm run validate` and update [Validation](validation.md). When you make a modelling decision, add an entry to [Decisions](decisions.md).

| Page | What's in it |
| --- | --- |
| [Validation](validation.md) | How accurate PropLab is against wind-tunnel data, per prop and per model, and how to re-run it |
| [Reference data](reference-data.md) | UIUC and APC datasets: sources, formats, definitions, attribution, how to add more |
| [NeuralFoil](neuralfoil.md) | The airfoil AI model: what it is, how it was ported to JavaScript, how it's verified and its limits |
| [Insights from the data](insights.md) | Things the measurements taught us about real propellers |
| [Decisions](decisions.md) | Log of modelling and calibration decisions with the evidence for each |
| [Open questions](open-questions.md) | Known gaps and ideas worth investigating |
