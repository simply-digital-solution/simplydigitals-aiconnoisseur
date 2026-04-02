import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import LandingPage from '../components/landing/LandingPage'

function renderLanding() {
  return render(<MemoryRouter><LandingPage /></MemoryRouter>)
}

describe('LandingPage', () => {
  it('renders the company name', () => {
    renderLanding()
    expect(screen.getAllByText(/Simply Digital Solutions/i).length).toBeGreaterThan(0)
  })

  it('renders the hero headline', () => {
    renderLanding()
    expect(screen.getAllByText(/AI-Native/i).length).toBeGreaterThan(0)
  })

  it('renders the "View Live Platform" button linking to /login', () => {
    renderLanding()
    const link = screen.getByRole('link', { name: /View Live Platform/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/login')
  })

  it('renders the nav "Launch App" button linking to /login', () => {
    renderLanding()
    const link = screen.getByRole('link', { name: /Launch App/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/login')
  })

  it('renders the CTA "Launch AIConnoisseur" button linking to /login', () => {
    renderLanding()
    const link = screen.getByRole('link', { name: /Launch AIConnoisseur/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/login')
  })

  it('renders the footer "Product" link pointing to /login', () => {
    renderLanding()
    const link = screen.getByRole('link', { name: /^Product$/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/login')
  })

  it('renders all "Tech Architecture" links pointing to /showcase', () => {
    renderLanding()
    const links = screen.getAllByRole('link', { name: /Tech Architecture/i })
    expect(links.length).toBeGreaterThan(0)
    links.forEach(link => expect(link).toHaveAttribute('href', '/showcase'))
  })

  it('renders the tech section "View Architecture" link pointing to /showcase', () => {
    renderLanding()
    const link = screen.getByRole('link', { name: /View Architecture/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/showcase')
  })

  it('renders the footer "Architecture" link pointing to /showcase', () => {
    renderLanding()
    const link = screen.getByRole('link', { name: /^Architecture$/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/showcase')
  })

  it('renders GitHub links pointing to the correct external repo', () => {
    renderLanding()
    const links = screen.getAllByRole('link', { name: /github/i })
    expect(links.length).toBeGreaterThan(0)
    links.forEach(link =>
      expect(link).toHaveAttribute('href', 'https://github.com/simply-digital-solution/simplydigitals-aiconnoisseur')
    )
  })

  it('renders nav anchor links for page sections', () => {
    renderLanding()
    expect(screen.getByRole('link', { name: /^About$/i })).toHaveAttribute('href', '#about')
    expect(screen.getByRole('link', { name: /^Vision$/i })).toHaveAttribute('href', '#vision')
    expect(screen.getByRole('link', { name: /^Why Us$/i })).toHaveAttribute('href', '#differentiators')
    expect(screen.getByRole('link', { name: /^Tech$/i })).toHaveAttribute('href', '#tech')
  })

  it('renders the About section', () => {
    renderLanding()
    expect(screen.getByText(/AI-Native Development/i)).toBeInTheDocument()
  })

  it('renders the Differentiators section', () => {
    renderLanding()
    expect(screen.getByText(/End-to-End Ownership/i)).toBeInTheDocument()
  })

  it('renders the Tech Stack section', () => {
    renderLanding()
    expect(screen.getByText(/React 18/i)).toBeInTheDocument()
  })

  it('renders the footer', () => {
    renderLanding()
    expect(screen.getAllByText(/Simply Digital Solutions/i).length).toBeGreaterThanOrEqual(2)
  })
})
