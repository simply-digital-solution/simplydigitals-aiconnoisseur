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

  it('renders the "Tech Architecture" link pointing to /showcase', () => {
    renderLanding()
    const links = screen.getAllByRole('link', { name: /Tech Architecture/i })
    expect(links.length).toBeGreaterThan(0)
    expect(links[0]).toHaveAttribute('href', '/showcase')
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
