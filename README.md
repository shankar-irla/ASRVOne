# ASRVOne Academy

An original, responsive ASRVOne web experience built with plain HTML, CSS, and JavaScript. The ivory palace now has a staged architectural reveal, pointer and scroll depth, a live particle field, and a scroll-led story around the learning community.

## Run locally

Requires Node.js 20 or newer. No package installation is needed.

```sh
node server.mjs
```

Then open [http://127.0.0.1:4173](http://127.0.0.1:4173).

## What's here

- A responsive public ASRVOne experience, using the supplied brand image and the brand profile's identity, values, learning principles, program themes, and founder details.
- An original palace illustration composed in SVG with staged tower, dome, stair, and lantern reveals; mouse tilt; scroll-linked depth; and a lightweight canvas star field.
- An interactive learning-principles panel, expandable course chapters, a Java + DSA starting-point guide, and two short Java exercises with immediate explanations.
- A registration form connected to the supplied Formspree endpoint. It sends the applicant fields with `email` as the reply/autoresponse address and shows a branded on-page success state only after Formspree accepts the submission.
- Keyboard navigation, reduced-motion support, responsive mobile navigation, and semantic page landmarks.

## Enable the thank-you email

Formspree sends the form receipt through its own autoresponse action. In the Formspree dashboard for form `xkjgeklk`, open **Workflow → Actions → Add New → Auto Response**, then set the sender name to `ASRVOne`, a subject such as `Thank you for finding your way to ASRVOne`, and this message:

> Your registration is with us. Every bright path begins with a question you choose to follow; we’re grateful you shared yours with us. Our team will be in touch about the next step. Until then, keep your curiosity close. — ASRVOne

The form already sends the required `email` field. Formspree currently lists autoresponses for Professional and Business plans; without that workflow action, the website still shows its on-page confirmation but Formspree will not email the applicant.

## Platform scope

The starting repository had no application, database, credentials, live schedules, social/community invite URLs, or AI provider configuration. The Formspree form is wired in code, but this build has not submitted a real registration. User accounts, an admin CMS, persistent course progress, live-session scheduling, community access, and Astra AI need their service links or provider credentials before they can be connected. Those services are not presented as working integrations here.
