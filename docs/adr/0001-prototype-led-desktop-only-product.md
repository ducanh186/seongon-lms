---
status: accepted
---

# Use prototype-led logic in a desktop-only product

The product owner chose `SPEC/seongon_learning_prototype_v3.html` as the primary reference for navigation, role behavior, workflows, layout hierarchy, and interaction logic after the latest explicit user direction. The implementation will support desktop viewports from `1280px`, remove mobile navigation/layout behavior, and show an unsupported-screen notice below that width; this deliberately trades mobile reach for closer prototype fidelity and a bounded acceptance target.

Generated course imagery and illustrative testimonials may use `imagegen`, but fictional testimonials must be visibly labelled `Nội dung minh họa`. Real API data remains authoritative for courses, roles, cart, learning progress, certificates, news, and Admin aggregates; prototype demo values must not replace live business records.
