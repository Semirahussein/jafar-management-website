import Link from "next/link";
import "./home.css";
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
          <div className="program-card">
            <div className="program-icon">📚</div>
            <h3>ISLAMIC STUDIES</h3>
            <p>Gain a deeper understanding of Islamic teachings like Aqeedah, Fiqh, Hadeeth, Seerah, and Islamic Manners.</p>
          </div>

<div className="center-button">
  <Link href="/programs" className="primary-button">VIEW ALL PROGRAMS</Link>
</div>

        </div>
      </div>
    </section>


<section className="why-us section">
  <div className="container">
    <div className="section-heading">
      <h2 className="section-tag">Why Choose Us</h2>
      <p>Discover the unique advantages of learning at JAFARU TOYAR QURAN AND ISLAMIC EDUCATION CENTER.</p>
    </div>
<div className="why-grid">
  <div className="why-card">
    <div className="why-number">01</div>
    <h3>Qualified and Experienced Teachers</h3>
    <p>Our teachers are highly qualified and experienced in teaching 
      Quran and Islamic studies, ensuring that students receive the best education possible.</p>
  </div>
  <div className="why-card">
    <div className="why-number">02</div>
    <h3>Comprehensive Curriculum</h3>
    <p>We offer a comprehensive curriculum that covers all aspects of Quranic
       education and Islamic studies, catering to students of all ages and levels.</p>
  </div>
  <div className="why-card">
    <div className="why-number">03</div>
    <h3>Supportive Learning Environment</h3>
    <p>We provide a supportive and nurturing learning
       environment where students can grow spiritually and academically.</p>
  </div>
  <div className="why-card">
    <div className="why-number">04</div>
    <h3>Multiple Branches</h3>
    <p>We have multiple branches to make our programs 
      accessible to students in different locations.</p>
  </div>
  <div className="why-card">
    <div className="why-number">05</div>
    <h3>Student Progress Tracking</h3>
    <p>We provide comprehensive progress tracking to
       monitor and support each student&apos;s learning journey.</p>
  </div>
  <div className="why-card">
    <div className="why-number">06</div>
    <h3>Community Engagement</h3>
    <p>We actively engage with the community through events, workshops, and outreach programs to promote Islamic education and values.</p>
  </div>
</div>
</div>
</section>

<section className="cta">
  <div className="container cta-content">
    <div>
   <p className="section-tag">JOIN OUR COMMUNITY</p>
  <h2>Ready to Start Your Child&apos;s Islamic Education Journey?</h2>
  <p>Join JAFARU TOYAR QURAN AND ISLAMIC EDUCATION CENTER today and embark on a path of knowledge and spiritual growth.
  </p>
  </div>

  <Link href="/contact" className="white-button">Contact Us
  </Link>
  </div>

</section>

<footer className="footer">
  <div className="container footer-grid">
      <span className="footer-logo">☪️JAFARU TOYAR QURAN AND ISLAMIC EDUCATION CENTER</span>
      <p>Nurturing faith, knowledge, character, and a lifelong connection
              with the Quran.</p>
              </div>
 <div>
    <h4>Quick Links</h4>
    <ul>
      <li><Link href="/">Home</Link></li>
      <li><Link href="/about">About Us</Link></li>
      <li><Link href="/programs">Programs</Link></li>
      <li><Link href="/admissions">Admissions</Link></li>
    </ul>
 </div>

 <div>
  <h4>Our Branches</h4>
  <ul>
    <li>Main Branch </li>
    <li>Farqadah Branch </li>
    <li>Girls Branch </li>
  </ul>
 </div>

   <div>
    <h4>Contact Us</h4>
    <ul>
      <li>Email: info@jafarutoyar.com</li>
      <li>Phone: +251 (123) 456-7890</li>
      <li>Address: Shaggar City, Ethiopia</li>
    </ul>
  </div>

    <div className="footer-social">
      <h4>Follow Us</h4>
      <ul>
        <li><Link href="https://www.facebook.com/jafarutoyar" target="_blank">Facebook</Link></li>
        <li><Link href="https://twitter.com/jafarutoyar" target="_blank">Twitter</Link></li>
        <li><Link href="https://www.instagram.com/jafarutoyar" target="_blank">Instagram</Link></li>
      </ul>
    </div>

    <div className="copyright">
      <p>&copy; {new Date().getFullYear()} JAFARU TOYAR QURAN AND ISLAMIC EDUCATION CENTER. All rights reserved.</p>
    </div>
</footer>
    </main>
    )}