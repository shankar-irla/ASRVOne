import { CmsEditor } from "./editor";

export default function CmsPage() {
  return <main className="platform-page"><section className="platform-panel"><p className="platform-eyebrow">THE WORDS THAT WELCOME</p><h1>Shape the <em>front door.</em></h1><p className="platform-lede">Edit the public section titles and service descriptions. Each save keeps a version so earlier language can be recovered.</p><CmsEditor /></section></main>;
}
