---
date: "2026-01-16T23:51:26+05:30"
title: "Deployment - JudgeME | Day 3"
weight: 3
toc: true
toc_position: "right"
---

{{< breadcrumbs >}}

---

# Deployment Day

> "Deployment is painful" - _Anurag Sharma_

I started deployment on _Render_ as I was already familiar with the process and their Free Tier is pretty generous, especially if I am not expecting much traffic. :/

I deployed the backend and then tested with my localhost frontend if the requests are reaching the backend successfully.

Then I moved on to deploying the frontend and the things were working fine _(spoiler: they were not)_
I tested with chess.com and leetcode and the responses were fine.

Until...

So coming to the next day, I was just playing around again with it and I logged in with github. And it was completely broken.

- I found there was a hardcoded localhost POST request in the backend. I am never using localhost URLs during developemnt ever again, only using ENV files form now on.

**More problems**:

An issue arose because react-router-dom uses client-side routing, creating URLs that don't exist on the server. Vite handles this locally but production environments throw 404 errors for unknown routes.

- Solution was to configure Render to use a **Rewrite** Rule. This tricks the server into sending index.html for every request. Once index.html loads, React spins up, reads the URL, and loads the correct page.

With this, I am closing this project and moving on to working on other projects. This was a fun experience and taught me a lot of stuff, both technical and conventions to follow. I have a few ideas that I might add in the future like using multimodal if the request to one model fails due to GeminiAPI RPD limits.

Any thoughts, feedback or suggestions? Mail me.

_Good-bye_
