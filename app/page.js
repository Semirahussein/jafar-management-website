import Link from "next/link";
export default function HomePage() {
  return (
    <main>
      <nav className="navbar">
        <div className="container nav-container">
          <Link href="/" className="logo">
          <span className="logo-icon">☪️</span>
          <span>JAFARU TOYAR QURAN AND ISLAMIC EDUCATION CENTER </span>
</Link>
<div className="nav-links">
  <Link href="/">HOME</Link>
   <Link href="/about">ABOUT US</Link>
    <Link href="/programs">PROGRAMS</Link> 
    <Link href="/admission">ADMISSION</Link> 
    <Link href="/gallery">GALLERY</Link>
     <Link href="/news">NEWS</Link>
     <Link href="/contact">CONTACT US</Link>
</div>
<Link href="/admission" className="apply-button">APPLY NOW</Link>
      </div>
      </nav>

      <section className="hero">
        <div className="hero-overlay"></div>
        <div className="container hero-content">
          <p className="hero-tag">Welcome to JAFARU TOYAR QURAN AND ISLAMIC EDUCATION CENTER</p>
          <p className="hero-description">Empowering minds through Islamic education and Quranic teachings.</p>

<div className="hero-buttons">
  <Link href="/about" className="primary-button">LEARN MORE
  </Link>
  <Link href="/admission" className="secondary-button">APPLY NOW</Link>
        </div>
        </div>
      </section>

<section className="features">
  <div className="container features-grid">
    <div className="feature-card">
      <div className="feature-icon">📖</div>
      <h3>Quran education</h3>
      <p>Comprehensive Quranic education designed to help 
        students build a strong connection with the Quran.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">👨‍🏫</div>
          <h3>Qualified Teachers</h3>
          <p>Learn from experienced and knowledgeable
             Quran teachers who are dedicated to providing
              high-quality Islamic education.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">🏫</div>
          <h3>Multiple Branches</h3>
          <p>providing islamic educations in multiple locations.</p>
        </div>
      </div>
  </section>

  <section className="about-preview section">
    <div className="container about-pgrid">
      <div className="about-image">
        <div className="image-placeholder">
          <span>☪️</span>
          </div>
        </div>
      <div className="about-content">
        <h2 className="section-tag">About Our Madrasa</h2>
        <p>JAFARU TOYAR QURAN AND ISLAMIC EDUCATION CENTER is dedicated to 
          providing high-quality Islamic education and Quranic 
          teachings to students of all ages. Our mission is to 
          empower minds through knowledge and spiritual growth.</p>

          <p> Our goal is to create a safe and supportive learning environment
              where every student can grow spiritually and academically.</p>
        <Link href="/about" className="primary-button">LEARN MORE</Link>
      </div>
    </div>

    </section>


    <section className="programs section">
      <div className="container">
        <div className="section-heading">
          <h2 className="section-tag">Our Programs</h2>
          <p>Explore our diverse range of programs designed to cater to the needs of students at different levels of Islamic education.</p>
        </div>

        <div className="programs-grid">
          <div className="program-card">
            <div className="program-icon">📖</div>
            <h3>QAIDA</h3>
            <p>Learn the fundamentals of Quranic recitation and pronunciation.</p>
          </div>
          <div className="program-card">
            <div className="program-icon">📖</div>
            <h3>TAJWEED</h3>
            <p>Master the rules of Tajweed to enhance your Quranic recitation.</p>
          </div>
          <div className="program-card">
            <div className="program-icon">📖</div>
            <h3>NAZAR</h3>
            <p> Learn to read the Quran correctly with proper pronunciation and
                guidance.</p>
          </div>
          <div className="program-card">
            <div className="program-icon">📚</div>
            <h3>HIFZ</h3>
            <p>Memorize the entire Quran with our structured Hifz program.</p>
          </div>
        </div>
      </div>
    </section>

    </main>
    )}