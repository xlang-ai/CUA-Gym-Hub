import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppState } from '../context/AppContext'
import InfoModal from '../components/InfoModal'

const NEWS_ITEMS = [
  {
    title: 'XpenReview Introduces Multi-Factor Authentication for All Users',
    date: 'Mar 23, 2026',
    body: 'Starting this week, all XpenReview accounts require a second factor at sign-in. Program chairs and area chairs handling confidential review data are affected first; general users will be migrated over the following month. Existing sessions remain valid until their normal expiry.',
  },
  {
    title: 'Survey Finds Broad Support for Greater Openness in AI Peer Review',
    date: 'Feb 13, 2026',
    body: 'A survey of over 4,000 reviewers and authors across XpenReview-hosted venues found strong support for open identities in post-decision discussion phases, while pre-decision anonymity remained the preferred default. The full survey methodology and results are available to venue organizers on request.',
  },
  {
    title: 'A Message from AI Research Leaders: Join Us in Supporting XpenReview',
    date: 'Dec 19, 2025',
    body: 'A group of research leaders from academia and industry have signed an open letter encouraging their communities to host venues on XpenReview and to contribute to its nonprofit operating costs. XpenReview remains free for all venues to use.',
  },
]

const FOOTER_LINKS = {
  about: {
    title: 'About XpenReview',
    body: 'XpenReview is a nonprofit organization dedicated to open publishing, open peer review, and open science. It hosts program committees for conferences, workshops, and journals across machine learning and related fields.',
  },
  hosting: {
    title: 'Hosting a Venue',
    body: 'Program chairs can request a new venue by contacting the XpenReview team with the venue name, expected submission volume, and review timeline. Venues are configured with customizable reviewer assignment, discussion, and decision workflows at no cost.',
  },
  allVenues: {
    title: 'All Venues',
    body: 'XpenReview hosts hundreds of active venues across machine learning, computer vision, natural language processing, and related fields. A searchable directory of every venue, past and present, is maintained separately from the homepage highlights.',
  },
  contact: {
    title: 'Contact',
    body: 'For account issues, venue hosting requests, or technical support, reach the XpenReview team through the support form linked from your profile page. Response times are typically within two business days.',
  },
  sponsors: {
    title: 'Sponsors',
    body: 'XpenReview’s infrastructure and staff are funded by a mix of institutional sponsors and individual donations. Sponsor organizations receive recognition on venue pages they support.',
  },
  faq: {
    title: 'Frequently Asked Questions',
    body: 'Common questions cover account creation, venue submission deadlines, reviewer assignment, and how to request a profile merge. A full FAQ is maintained by the XpenReview team and linked from every venue’s information page.',
  },
  terms: {
    title: 'Terms of Use / Privacy Policy',
    body: 'XpenReview collects the minimum data needed to operate peer review: profile information, submissions, and reviews. Data is not sold to third parties. Full legal terms are available to all registered users.',
  },
  news: {
    title: 'News',
    body: 'XpenReview publishes periodic updates about platform changes, security notices, and community initiatives. See the News panel on the homepage for the latest posts.',
  },
}

function Homepage() {
  const { state, sid } = useAppState()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [modal, setModal] = useState(null) // { title, body } | null

  const appendSid = (path) => {
    if (!sid) return path
    return `${path}${path.includes('?') ? '&' : '?'}sid=${sid}`
  }

  const handleVenueClick = (venueId) => {
    navigate(appendSid(`/group?id=${venueId}`))
  }

  const venue = state.venue
  const showFooter = (key) => setModal(FOOTER_LINKS[key])
  const showNews = (news) => setModal({ title: news.title, body: `${news.date}\n\n${news.body}` })
  const showAllNews = () => setModal({
    title: 'All XpenReview News',
    body: NEWS_ITEMS.map(n => `${n.title} (${n.date})`).join('\n\n'),
  })
  const showDonate = () => setModal({
    title: 'Support XpenReview',
    body: 'XpenReview is a nonprofit and relies on institutional and individual donations to cover hosting and staff costs. Donation processing is handled by our fiscal sponsor outside of this site; venue organizers can request donor information from the XpenReview team.',
  })
  const showVenuePreview = (name, description) => setModal({ title: name, body: description })

  return (
    <div>
      {/* Tagline bar */}
      <div className="tagline-bar">
        <div className="container">
          Open Peer Review. Open Publishing. Open Access. Open Discussion. Open Recommendations. Open Directory. Open API. Open Source.{' '}
          <a href="#" className="donate-link" style={{ color: '#3e6775' }} onClick={e => { e.preventDefault(); showDonate() }}>Donate</a>
        </div>
      </div>

      <div className="container" style={{ paddingTop: 25 }}>
        {/* News box */}
        <div style={{ border: '1px solid rgba(0,0,0,0.1)', borderRadius: 0, padding: '15px 20px', marginBottom: 30 }}>
          <h2 style={{ fontSize: 24, fontWeight: 400, marginBottom: 15, color: '#2c3a4a' }}>News</h2>
          <div>
            {NEWS_ITEMS.map((news, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < 2 ? '1px solid #f0f0f0' : 'none' }}>
                <a href="#" style={{ fontSize: 15 }} onClick={e => { e.preventDefault(); showNews(news) }}>{news.title}</a>
                <span style={{ color: '#757575', fontSize: 14, flexShrink: 0, marginLeft: 20 }}>{news.date}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 10 }}>
            <a href="#" style={{ fontSize: 14 }} onClick={e => { e.preventDefault(); showAllNews() }}>View all XpenReview news</a>
          </div>
        </div>

        {/* Two column: Active Venues + Open for Submissions */}
        <div className="home" style={{ display: 'flex', gap: 40 }}>
          {/* Left: Active Venues */}
          <div className="col-xs-12 col-sm-6" style={{ flex: 1 }}>
            <h2 style={{ fontSize: 24, fontWeight: 400, marginBottom: 15, color: '#2c3a4a', borderBottom: '1px solid rgba(0,0,0,0.1)', paddingBottom: 10 }}>Active Venues</h2>
            <ul className="conferences list-unstyled">
              <li style={{ padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
                <h2 style={{ fontSize: 16, margin: 0 }}>
                  <a
                    href={`/group?id=${venue.id}`}
                    className="leading-venue"
                    onClick={(e) => { e.preventDefault(); handleVenueClick(venue.id) }}
                  >
                    {venue.shortPhrase}
                  </a>
                </h2>
              </li>
              {[
                { name: 'TMLR', description: 'Transactions on Machine Learning Research — a rolling-review journal for machine learning with no submission deadlines. Not yet hosted as a separate venue in this sandbox.' },
                { name: 'Computo', description: 'A journal for reproducible statistics and data science papers with an emphasis on executable, peer-reviewed code. Not yet hosted as a separate venue in this sandbox.' },
                { name: 'DMLR', description: 'Journal of Data-centric Machine Learning Research, covering datasets and benchmarks papers. Not yet hosted as a separate venue in this sandbox.' },
              ].map((v, i) => (
                <li key={i} style={{ padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
                  <h2 style={{ fontSize: 16, margin: 0 }}>
                    <a href="#" style={{ color: '#3e6775' }} onClick={e => { e.preventDefault(); showVenuePreview(v.name, v.description) }}>{v.name}</a>
                  </h2>
                </li>
              ))}
            </ul>
          </div>

          {/* Right: Open for Submissions */}
          <div className="col-xs-12 col-sm-6" style={{ flex: 1 }}>
            <h2 style={{ fontSize: 24, fontWeight: 400, marginBottom: 15, color: '#2c3a4a', borderBottom: '1px solid rgba(0,0,0,0.1)', paddingBottom: 10 }}>Open for Submissions</h2>
            <ul className="conferences list-unstyled">
              <li style={{ padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
                <h2 style={{ fontSize: 16, margin: 0 }}>
                  <a
                    href={`/group?id=${venue.id}&referrer=${encodeURIComponent('[Homepage](/)')}`}
                    onClick={(e) => { e.preventDefault(); handleVenueClick(venue.id) }}
                  >
                    {venue.fullName}
                  </a>
                </h2>
                <div style={{ fontSize: 13, color: '#757575', marginTop: 2 }}>
                  Due {new Date(venue.deadline).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </li>
              {[
                { name: 'ACL 2026 Workshop SURGeLLM', due: '26 Mar 2026', description: 'Workshop on Search, Understanding, Reasoning, and Generation with Large Language Models, co-located with ACL 2026. Not yet hosted as a separate venue in this sandbox.' },
                { name: 'ACMMM 2026 Conference', due: '26 Mar 2026', description: 'ACM International Conference on Multimedia, covering multimedia systems, content analysis, and applications. Not yet hosted as a separate venue in this sandbox.' },
                { name: 'ICML 2026 Workshop on Foundation Models', due: '15 Apr 2026', description: 'A workshop track at ICML 2026 focused on pretraining, alignment, and evaluation of foundation models. Not yet hosted as a separate venue in this sandbox.' },
              ].map((v, i) => (
                <li key={i} style={{ padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
                  <h2 style={{ fontSize: 16, margin: 0 }}>
                    <a href="#" style={{ color: '#3e6775' }} onClick={e => { e.preventDefault(); showVenuePreview(v.name, v.description) }}>{v.name}</a>
                  </h2>
                  <div style={{ fontSize: 13, color: '#757575', marginTop: 2 }}>Due {v.due}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="sitemap" style={{ marginTop: 60, borderTop: '1px solid #dddddd', padding: '20px 0' }}>
        <div className="container">
          <div className="row" style={{ display: 'flex', justifyContent: 'center', gap: 30, marginBottom: 15, flexWrap: 'wrap' }}>
            <a href="#" style={{ color: '#2c3a4a', fontSize: 14 }} onClick={e => { e.preventDefault(); showFooter('about') }}>About XpenReview</a>
            <a href="#" style={{ color: '#2c3a4a', fontSize: 14 }} onClick={e => { e.preventDefault(); showFooter('hosting') }}>Hosting a Venue</a>
            <a href="#" style={{ color: '#2c3a4a', fontSize: 14 }} onClick={e => { e.preventDefault(); showFooter('allVenues') }}>All Venues</a>
            <a href="#" style={{ color: '#2c3a4a', fontSize: 14 }} onClick={e => { e.preventDefault(); showFooter('contact') }}>Contact</a>
            <a href="#" style={{ color: '#2c3a4a', fontSize: 14 }} onClick={e => { e.preventDefault(); showFooter('sponsors') }}>Sponsors</a>
            <a href="#" style={{ color: '#2c3a4a', fontSize: 14 }} onClick={e => { e.preventDefault(); showDonate() }}>Donate</a>
            <a href="#" style={{ color: '#2c3a4a', fontSize: 14 }} onClick={e => { e.preventDefault(); showFooter('faq') }}>FAQ</a>
            <a href="#" style={{ color: '#2c3a4a', fontSize: 14 }} onClick={e => { e.preventDefault(); showFooter('terms') }}>Terms of Use / Privacy Policy</a>
            <a href="#" style={{ color: '#2c3a4a', fontSize: 14 }} onClick={e => { e.preventDefault(); showFooter('news') }}>News</a>
          </div>
        </div>
      </footer>
      <div className="sponsor" style={{ textAlign: 'center', padding: '10px 0' }}>
        <p style={{ fontSize: 12, color: '#999' }}>
          XpenReview is a long-term project to advance science through improved peer review with legal nonprofit status. &copy; 2026 XpenReview
        </p>
      </div>

      {modal && (
        <InfoModal title={modal.title} onClose={() => setModal(null)}>
          <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{modal.body}</p>
        </InfoModal>
      )}
    </div>
  )
}

export default Homepage
