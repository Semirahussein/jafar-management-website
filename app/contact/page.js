import Link from "next/link";
import "./contact.css";
import ContactForm from "./contactForm";    


export const metadata = {
  title: "Contact Us | Jafar Madrasa",
  description:
    "Get in touch with Jafar Madrasa for admissions, programs, branch information, and general inquiries.",
};

export default function ContactPage() {
  return (
    <main className="contact-page">

      

      <section className="contact-hero">
        <div className="contact-hero-content">

          <span className="contact-label">
            GET IN TOUCH
          </span>

          <h1>
            Contact <span>Jafar Madrasa</span>
          </h1>

          <p>
            Have a question about our programs, admissions, or branches?
            We would be happy to hear from you.
          </p>

        </div>
      </section>


            <section className="contact-intro">

        <span className="section-label">
          WE ARE HERE TO HELP
        </span>

        <h2>
          Let&apos;s Start a Conversation
        </h2>

        <p>
          Whether you are a parent looking for Quranic education for your
          child, a student interested in joining our programs, or simply
          want to learn more about Jafar Madrasa, feel free to contact us.
        </p>

      </section>


      {/* CONTACT INFORMATION + FORM */}

      <section className="contact-main">

        {/* CONTACT INFORMATION */}

        <div className="contact-info">

          <span className="section-label">
            CONTACT INFORMATION
          </span>

          <h2>
            We&apos;d Love to Hear From You
          </h2>

          <p className="contact-info-intro">
            Reach out to us through any of the following channels.
            Our team will do its best to respond to your inquiry.
          </p>


          {/* PHONE */}

          <div className="contact-item">

            <div className="contact-icon">
              ☎
            </div>

            <div>
              <h3>Phone</h3>

              <p>
                +251 123 456 789
              </p>

              <p>
                +251 987 654 321
              </p>
            </div>

          </div>


          {/* EMAIL */}

          <div className="contact-item">

            <div className="contact-icon">
              ✉
            </div>

            <div>
              <h3>Email</h3>

              <p>
                info@jafarmadrasa.com
              </p>
            </div>

          </div>


          {/* ADDRESS */}

          <div className="contact-item">

            <div className="contact-icon">
              📍
            </div>

            <div>
              <h3>Address</h3>

              <p>
                Addis Ababa, Ethiopia
              </p>

              <p>
                Jafar Madrasa
              </p>
            </div>

          </div>


          {/* HOURS */}

          <div className="contact-item">

            <div className="contact-icon">
              ◷
            </div>

            <div>
              <h3>Office Hours</h3>

              <p>
                Monday – Friday
              </p>

              <p>
                8:00 AM – 5:00 PM
              </p>
            </div>

          </div>

        </div>


        {/* CONTACT FORM */}

        <div className="contact-form-wrapper">

          <span className="section-label">
            SEND US A MESSAGE
          </span>

          <h2>
            How Can We Help?
          </h2>
           <p>
        Fill out the form and send us your message. Whether you
        are a parent, student, or someone interested in learning
        more about Jafar Madrasa, we would be happy to hear from you.
      </p>

         <ContactForm />

        </div>

      </section>


      {/*  BRANCHES */}

      <section className="branches-section">

        <div className="branches-heading">

          <span className="section-label">
            OUR LOCATIONS
          </span>

          <h2>
            Find a Jafar Madrasa Branch
          </h2>

          <p>
            With multiple campuses, we are working to make Quranic
            and Islamic education accessible to more students and families.
          </p>

        </div>


        <div className="branches-grid">

          <div className="branch-card">

            <span className="branch-number">
              01
            </span>

            <h3>
              Main Branch
            </h3>

            <p>
              Addis Ababa, Ethiopia
            </p>

            <Link href="/contact">
              Get Directions →
            </Link>

          </div>


          <div className="branch-card">

            <span className="branch-number">
              02
            </span>

            <h3>
              Second Branch
            </h3>

            <p>
              Addis Ababa, Ethiopia
            </p>

            <Link href="/contact">
              Get Directions →
            </Link>

          </div>


          <div className="branch-card">

            <span className="branch-number">
              03
            </span>

            <h3>
              Other Branches
            </h3>

            <p>
              More locations coming soon
            </p>

            <Link href="/contact">
              Contact Us →
            </Link>

          </div>

        </div>

      </section>


      {/*   MAP PLACEHOLDER     */}

      <section className="map-section">

        <div className="map-placeholder">

          <div className="map-content">

            <div className="map-pin">
              ⌖
            </div>

            <h3>
              Find Us
            </h3>

            <p>
              Our interactive map will be available here.
            </p>

          </div>

        </div>

      </section>


      {/* =========================
          CTA
      ========================= */}

      <section className="contact-cta">

        <div className="contact-cta-content">

          <span className="section-label">
            JOIN OUR COMMUNITY
          </span>

          <h2>
            Ready to Begin Your
            Quranic Learning Journey?
          </h2>

          <p>
            Learn more about our programs and take the first step
            toward a meaningful Quranic education.
          </p>

          <Link
            href="/admissions"
            className="contact-button"
          >
            Apply Now →
          </Link>

        </div>

      </section>

    </main>
  );
}