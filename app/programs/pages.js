
import "./programs.css";

export const metadata = {
  title: "Our Programs | Jafar Madrasa",
  description:
    "Explore the Quranic and Islamic education programs offered at Jafar Madrasa.",
};

export default function ProgramsPage() {
  return (
    <main className="programs-page">

      <section className="programs-hero">
        <div className="programs-hero-content">

          <span className="programs-label">
            OUR PROGRAMS
          </span>

          <h1>
            Learning the Quran,
            <span> Growing in Faith</span>
          </h1>

          <p>
            Our programs are designed to help students build a strong
            relationship with the Quran, improve their recitation,
            memorize with confidence, and develop Islamic knowledge.
          </p>

        </div>
      </section>


      
      <section className="programs-intro">

        <span className="section-label">
          WHAT WE OFFER
        </span>

        <h2>
          Programs Designed for
          <br />
          Every Learning Journey
        </h2>

        <p>
          At Jafar Madrasa, we understand that every student has a
          different learning journey. Our programs provide structured
          Quranic and Islamic education while allowing students to
          progress according to their abilities and goals.
        </p>

      </section>


      {/* =========================
          MAIN PROGRAMS
      ========================= */}

      <section className="main-programs">

        <div className="program-card featured-program">

          <div className="program-icon">
            <span>01</span>
          </div>

          <div className="program-content">

            <span className="program-type">
              QURAN
            </span>

            <h3>
              Quran Recitation
            </h3>

            <p>
              Students learn to read the Quran correctly and confidently
              while developing accurate pronunciation and consistent
              recitation habits.
            </p>

            <ul>
              <li>Quran reading fundamentals</li>
              <li>Correct pronunciation</li>
              <li>Regular recitation practice</li>
              <li>Individual teacher guidance</li>
            </ul>

          </div>

        </div>


        <div className="program-card">

          <div className="program-icon">
            <span>02</span>
          </div>

          <div className="program-content">

            <span className="program-type">
              MEMORIZATION
            </span>

            <h3>
              Hifz Program
            </h3>

            <p>
              A structured program for students who want to memorize
              the Quran while maintaining regular revision and
              strengthening their memorization.
            </p>

            <ul>
              <li>New Quran memorization</li>
              <li>Daily revision</li>
              <li>Memorization progress tracking</li>
              <li>Teacher feedback</li>
            </ul>

          </div>

        </div>


        <div className="program-card">

          <div className="program-icon">
            <span>03</span>
          </div>

          <div className="program-content">

            <span className="program-type">
              TAJWEED
            </span>

            <h3>
              Tajweed
            </h3>

            <p>
              Students learn the rules of Tajweed and apply them
              during Quran recitation to improve accuracy and
              pronunciation.
            </p>

            <ul>
              <li>Tajweed rules</li>
              <li>Makharij</li>
              <li>Quranic pronunciation</li>
              <li>Practical recitation</li>
            </ul>

          </div>

        </div>


        <div className="program-card">

          <div className="program-icon">
            <span>04</span>
          </div>

          <div className="program-content">

            <span className="program-type">
              ISLAMIC EDUCATION
            </span>

            <h3>
              Islamic Studies
            </h3>

            <p>
              Students develop foundational Islamic knowledge and
              learn important principles that help them understand
              and practice their faith.
            </p>

            <ul>
              <li>Islamic manners and character</li>
              <li>Basic Islamic knowledge</li>
              <li>Stories of the Prophets</li>
              <li>Daily Islamic practices</li>
            </ul>

          </div>

        </div>

      </section>


     

      <section className="learning-section">

        <div className="learning-heading">

          <span className="section-label">
            HOW STUDENTS LEARN
          </span>

          <h2>
            A Structured Learning Journey
          </h2>

          <p>
            We combine regular lessons, practice, progress tracking,
            and teacher guidance to support every student&apos;s development.
          </p>

        </div>


        <div className="learning-steps">

          <div className="learning-step">

            <div className="step-number">
              01
            </div>

            <h3>
              Learn
            </h3>

            <p>
              Students receive lessons and guidance from their
              Quran teachers.
            </p>

          </div>


          <div className="learning-step">

            <div className="step-number">
              02
            </div>

            <h3>
              Practice
            </h3>

            <p>
              Students practice their recitation, memorization,
              and Islamic knowledge regularly.
            </p>

          </div>


          <div className="learning-step">

            <div className="step-number">
              03
            </div>

            <h3>
              Progress
            </h3>

            <p>
              Teachers monitor each student&apos;s progress and provide
              feedback throughout their learning journey.
            </p>

          </div>


          <div className="learning-step">

            <div className="step-number">
              04
            </div>

            <h3>
              Grow
            </h3>

            <p>
              Students build confidence, consistency, knowledge,
              and a stronger connection with the Quran.
            </p>

          </div>

        </div>

      </section>


      

      <section className="parent-section">

        <div className="parent-content">

          <span className="section-label">
            PARENTS & STUDENTS
          </span>

          <h2>
            Keeping Parents Connected
            to Their Child&apos;s Progress
          </h2>

          <p>
            We believe parents play an important role in a student&apos;s
            Quranic education. Teachers can provide regular updates
            about attendance, lessons, memorization, and Quranic
            progress so parents can stay informed about their child&apos;s
            learning journey.
          </p>

          <a
            href="/contact"
            className="program-button"
          >
            Contact Us →
          </a>

        </div>

      </section>


    

      <section className="programs-cta">

        <div>

          <span className="section-label">
            START LEARNING
          </span>

          <h2>
            Begin Your Quranic
            Learning Journey
          </h2>

          <p>
            Give your child the opportunity to learn, grow, and
            develop a lifelong connection with the Quran.
          </p>

          <a
            href="/admissions"
            className="program-button"
          >
            Apply Now →
          </a>

        </div>

      </section>

    </main>
  );
}

