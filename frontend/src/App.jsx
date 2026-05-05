import { useDeferredValue, useEffect, useState } from 'react'
import './App.css'
import {
  clearLearningList,
  createEnrollment,
  fetchCategories,
  fetchCourses,
  fetchCurrentUser,
  fetchEnrollments,
  fetchFeaturedCourses,
  fetchLearningList,
  fetchServiceStatus,
  loginUser,
  registerUser,
  removeCourseFromLearningList,
  saveCourseToLearningList,
  updateEnrollmentProgress,
} from './api'

const guestUser = {
  id: 'guest-learner',
  username: 'Guest Learner',
  email: 'guest@cloudshoplearn.local',
}

const emptyAuthForm = {
  username: '',
  email: '',
  password: '',
}

function formatPrice(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

function resolveUserId(user) {
  return String(user?.id ?? guestUser.id)
}

function readStoredSession() {
  const token = window.localStorage.getItem('cloudshop-token')
  const rawUser = window.localStorage.getItem('cloudshop-user')

  if (!token || !rawUser) {
    return null
  }

  try {
    return { token, user: JSON.parse(rawUser) }
  } catch {
    return null
  }
}

function App() {
  const storedSession = readStoredSession()
  const [catalog, setCatalog] = useState([])
  const [featuredCourses, setFeaturedCourses] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [learningList, setLearningList] = useState([])
  const [enrollments, setEnrollments] = useState([])
  const [enrollmentSummary, setEnrollmentSummary] = useState({ active: 0, completed: 0 })
  const [serviceStatus, setServiceStatus] = useState([])
  const [activeView, setActiveView] = useState('catalog')
  const [filters, setFilters] = useState({ search: '', category: 'All', level: 'All' })
  const [coursesLoading, setCoursesLoading] = useState(true)
  const [workspaceLoading, setWorkspaceLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [authLoading, setAuthLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [authMode, setAuthMode] = useState('register')
  const [authForm, setAuthForm] = useState(emptyAuthForm)
  const [authToken, setAuthToken] = useState(storedSession?.token ?? '')
  const [currentUser, setCurrentUser] = useState(storedSession?.user ?? guestUser)
  const deferredSearch = useDeferredValue(filters.search)
  const activeUserId = resolveUserId(currentUser)

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      try {
        const [featured, categoryResponse, statusResponse] = await Promise.all([
          fetchFeaturedCourses(),
          fetchCategories(),
          fetchServiceStatus(authToken),
        ])

        if (cancelled) {
          return
        }

        setFeaturedCourses(featured.items)
        setSelectedCourse(featured.items[0] ?? null)
        setCategories(categoryResponse.items)
        setServiceStatus(statusResponse)
      } catch {
        if (!cancelled) {
          setMessage({
            tone: 'error',
            text: 'The workspace loaded with partial data. Check that every microservice is running.',
          })
        }
      } finally {
        if (!cancelled) {
          setWorkspaceLoading(false)
        }
      }
    }

    bootstrap()

    return () => {
      cancelled = true
    }
  }, [authToken])

  useEffect(() => {
    let cancelled = false

    async function loadCourses() {
      setCoursesLoading(true)

      try {
        const response = await fetchCourses({
          search: deferredSearch || undefined,
          category: filters.category !== 'All' ? filters.category : undefined,
          level: filters.level !== 'All' ? filters.level : undefined,
        })

        if (cancelled) {
          return
        }

        setCatalog(response.items)
        setSelectedCourse((current) => {
          if (!current) {
            return response.items[0] ?? null
          }

          return response.items.find((course) => course.id === current.id) ?? response.items[0] ?? null
        })
      } catch {
        if (!cancelled) {
          setCatalog([])
          setMessage({
            tone: 'error',
            text: 'Catalog loading failed. The catalog service may not be available yet.',
          })
        }
      } finally {
        if (!cancelled) {
          setCoursesLoading(false)
        }
      }
    }

    loadCourses()

    return () => {
      cancelled = true
    }
  }, [deferredSearch, filters.category, filters.level])

  useEffect(() => {
    let cancelled = false

    async function hydrateStoredUser() {
      if (!authToken) {
        return
      }

      try {
        const response = await fetchCurrentUser(authToken)

        if (!cancelled && response.user) {
          setCurrentUser(response.user)
          window.localStorage.setItem('cloudshop-user', JSON.stringify(response.user))
        }
      } catch {
        if (!cancelled) {
          window.localStorage.removeItem('cloudshop-token')
          window.localStorage.removeItem('cloudshop-user')
          setAuthToken('')
          setCurrentUser(guestUser)
        }
      }
    }

    hydrateStoredUser()

    return () => {
      cancelled = true
    }
  }, [authToken])

  useEffect(() => {
    let cancelled = false

    async function loadLearnerWorkspace() {
      try {
        const [savedCourses, learnerEnrollments] = await Promise.all([
          fetchLearningList(activeUserId),
          fetchEnrollments(activeUserId),
        ])

        if (cancelled) {
          return
        }

        setLearningList(savedCourses.items)
        setEnrollments(learnerEnrollments.items)
        setEnrollmentSummary(learnerEnrollments.summary)
      } catch {
        if (!cancelled) {
          setMessage({
            tone: 'error',
            text: 'Learner workspace could not be refreshed. Check Redis and Postgres services.',
          })
        }
      }
    }

    loadLearnerWorkspace()

    return () => {
      cancelled = true
    }
  }, [activeUserId])

  async function refreshWorkspace() {
    const [savedCourses, learnerEnrollments, statusResponse] = await Promise.all([
      fetchLearningList(activeUserId),
      fetchEnrollments(activeUserId),
      fetchServiceStatus(authToken),
    ])

    setLearningList(savedCourses.items)
    setEnrollments(learnerEnrollments.items)
    setEnrollmentSummary(learnerEnrollments.summary)
    setServiceStatus(statusResponse)
  }

  async function handleSaveCourse(course) {
    setActionLoading(true)

    try {
      const response = await saveCourseToLearningList(activeUserId, course)
      setLearningList(response.items)
      setMessage({ tone: 'success', text: `${course.title} is now in the learning list.` })
      setActiveView('workspace')
    } catch (error) {
      setMessage({
        tone: 'error',
        text: error.response?.data?.detail ?? error.response?.data?.error ?? 'Could not save the course.',
      })
    } finally {
      setActionLoading(false)
    }
  }

  async function handleRemoveSavedCourse(courseId) {
    setActionLoading(true)

    try {
      const response = await removeCourseFromLearningList(activeUserId, courseId)
      setLearningList(response.items)
      setMessage({ tone: 'success', text: 'Course removed from the learning list.' })
    } catch (error) {
      setMessage({
        tone: 'error',
        text: error.response?.data?.detail ?? error.response?.data?.error ?? 'Could not remove the course.',
      })
    } finally {
      setActionLoading(false)
    }
  }

  async function handleClearLearningList() {
    setActionLoading(true)

    try {
      await clearLearningList(activeUserId)
      setLearningList([])
      setMessage({ tone: 'success', text: 'Learning list cleared.' })
    } catch (error) {
      setMessage({
        tone: 'error',
        text: error.response?.data?.detail ?? error.response?.data?.error ?? 'Could not clear the learning list.',
      })
    } finally {
      setActionLoading(false)
    }
  }

  async function handleEnroll(course) {
    setActionLoading(true)

    try {
      await createEnrollment(activeUserId, course)
      await refreshWorkspace()
      setMessage({
        tone: 'success',
        text: `${course.title ?? course.course_title} has been added to the learner dashboard.`,
      })
      setActiveView('dashboard')
    } catch (error) {
      setMessage({
        tone: 'error',
        text: error.response?.data?.detail ?? error.response?.data?.error ?? 'Enrollment could not be created.',
      })
    } finally {
      setActionLoading(false)
    }
  }

  async function handleAdvanceProgress(enrollment) {
    setActionLoading(true)

    try {
      await updateEnrollmentProgress(enrollment.id, enrollment.progress + 20)
      await refreshWorkspace()
      setMessage({ tone: 'success', text: `Progress updated for ${enrollment.course_title}.` })
    } catch (error) {
      setMessage({
        tone: 'error',
        text: error.response?.data?.detail ?? error.response?.data?.error ?? 'Progress update failed.',
      })
    } finally {
      setActionLoading(false)
    }
  }

  async function handleSubmitAuth(event) {
    event.preventDefault()
    setAuthLoading(true)

    try {
      const response = authMode === 'register'
        ? await registerUser(authForm)
        : await loginUser({ email: authForm.email, password: authForm.password })

      setAuthToken(response.token)
      setCurrentUser(response.user)
      window.localStorage.setItem('cloudshop-token', response.token)
      window.localStorage.setItem('cloudshop-user', JSON.stringify(response.user))
      setAuthForm(emptyAuthForm)
      setMessage({
        tone: 'success',
        text: authMode === 'register'
          ? 'Account created. Your workspace is ready.'
          : `Welcome back, ${response.user.username}.`,
      })
    } catch (error) {
      setMessage({
        tone: 'error',
        text: error.response?.data?.detail ?? error.response?.data?.error ?? 'Authentication failed.',
      })
    } finally {
      setAuthLoading(false)
    }
  }

  function handleLogout() {
    window.localStorage.removeItem('cloudshop-token')
    window.localStorage.removeItem('cloudshop-user')
    setAuthToken('')
    setCurrentUser(guestUser)
    setLearningList([])
    setEnrollments([])
    setEnrollmentSummary({ active: 0, completed: 0 })
    setMessage({
      tone: 'success',
      text: 'Switched back to guest mode. Register or sign in to persist a personal workspace.',
    })
  }

  const learningListTotal = learningList.reduce((sum, course) => sum + course.price, 0)
  const selectedCourseSaved = selectedCourse
    ? learningList.some((course) => course.course_id === selectedCourse.id)
    : false
  const selectedCourseEnrolled = selectedCourse
    ? enrollments.some((course) => course.course_id === selectedCourse.id)
    : false

  return (
    <div className="app-shell">
      <div className="app-backdrop" />
      <main className="app-layout">
        <header className="masthead">
          <div className="brand-block">
            <span className="eyebrow">CloudShop Learn</span>
            <h1>Build a sharper learner experience on top of your microservices stack.</h1>
            <p>
              A course platform shell with discovery, saved pathways, enrollment tracking,
              and an auth-aware learner workspace.
            </p>
          </div>

          <nav className="section-nav" aria-label="Primary">
            {[
              ['catalog', 'Catalog'],
              ['workspace', 'Learning List'],
              ['dashboard', 'Dashboard'],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={activeView === value ? 'nav-pill active' : 'nav-pill'}
                onClick={() => setActiveView(value)}
              >
                {label}
              </button>
            ))}
          </nav>
        </header>

        <section className="hero-grid">
          <article className="hero-card">
            <div className="hero-copy">
              <span className="eyebrow">Creative learning storefront</span>
              <h2>From raw services to a product-shaped frontend.</h2>
              <p>
                This experience is now wired to your live course catalog, learning list,
                enrollments, and auth APIs instead of the old placeholder shop demo.
              </p>
            </div>

            <div className="hero-metrics">
              <div>
                <strong>{catalog.length}</strong>
                <span>Courses visible</span>
              </div>
              <div>
                <strong>{learningList.length}</strong>
                <span>Saved picks</span>
              </div>
              <div>
                <strong>{enrollments.length}</strong>
                <span>Active enrollments</span>
              </div>
            </div>

            <div className="hero-spotlight">
              <p>Featured direction</p>
              <h3>{featuredCourses[0]?.title ?? 'Loading featured course'}</h3>
              <span>{featuredCourses[0]?.headline ?? 'Course stories and highlights appear here.'}</span>
            </div>
          </article>

          <aside className="auth-card">
            <div className="card-heading">
              <span className="eyebrow">Learner identity</span>
              <h3>{currentUser.username}</h3>
              <p>
                {authToken
                  ? currentUser.email
                  : 'Guest mode is active. Register to use a dedicated learning workspace.'}
              </p>
            </div>

            {authToken ? (
              <div className="auth-summary">
                <div className="summary-row">
                  <span>Status</span>
                  <strong>Authenticated</strong>
                </div>
                <div className="summary-row">
                  <span>Workspace</span>
                  <strong>{activeUserId}</strong>
                </div>
                <button type="button" className="ghost-button" onClick={handleLogout}>
                  Switch to guest mode
                </button>
              </div>
            ) : (
              <>
                <div className="auth-toggle">
                  <button
                    type="button"
                    className={authMode === 'register' ? 'toggle-chip active' : 'toggle-chip'}
                    onClick={() => setAuthMode('register')}
                  >
                    Register
                  </button>
                  <button
                    type="button"
                    className={authMode === 'login' ? 'toggle-chip active' : 'toggle-chip'}
                    onClick={() => setAuthMode('login')}
                  >
                    Sign in
                  </button>
                </div>

                <form className="auth-form" onSubmit={handleSubmitAuth}>
                  {authMode === 'register' ? (
                    <label>
                      Username
                      <input
                        value={authForm.username}
                        onChange={(event) => setAuthForm({ ...authForm, username: event.target.value })}
                        placeholder="Maya"
                      />
                    </label>
                  ) : null}

                  <label>
                    Email
                    <input
                      type="email"
                      value={authForm.email}
                      onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })}
                      placeholder="maya@cloudshop.dev"
                    />
                  </label>

                  <label>
                    Password
                    <input
                      type="password"
                      value={authForm.password}
                      onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })}
                      placeholder="At least 8 characters"
                    />
                  </label>

                  <button type="submit" className="primary-button" disabled={authLoading}>
                    {authLoading ? 'Working...' : authMode === 'register' ? 'Create learner account' : 'Sign in'}
                  </button>
                </form>
              </>
            )}
          </aside>
        </section>

        {message ? (
          <div className={message.tone === 'error' ? 'message-banner error' : 'message-banner success'}>
            <span>{message.text}</span>
            <button type="button" onClick={() => setMessage(null)}>
              Dismiss
            </button>
          </div>
        ) : null}

        <section className="content-grid">
          <section className={activeView === 'catalog' ? 'panel panel-main active' : 'panel panel-main'}>
            <div className="panel-header">
              <div>
                <span className="eyebrow">Discover</span>
                <h2>Course catalog</h2>
              </div>
              <div className="filter-shell">
                <input
                  value={filters.search}
                  onChange={(event) => setFilters({ ...filters, search: event.target.value })}
                  placeholder="Search by title, topic, or skill"
                />
                <select
                  value={filters.category}
                  onChange={(event) => setFilters({ ...filters, category: event.target.value })}
                >
                  <option value="All">All categories</option>
                  {categories.map((category) => (
                    <option key={category.name} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <select
                  value={filters.level}
                  onChange={(event) => setFilters({ ...filters, level: event.target.value })}
                >
                  <option value="All">All levels</option>
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>
            </div>

            {coursesLoading || workspaceLoading ? (
              <div className="loading-state">Loading course experience...</div>
            ) : (
              <div className="catalog-layout">
                <div className="course-grid">
                  {catalog.map((course) => (
                    <article
                      key={course.id}
                      className="course-card"
                      style={{ '--course-accent': course.color }}
                    >
                      <div className="course-card-top">
                        <span>{course.category}</span>
                        <strong>{course.level}</strong>
                      </div>
                      <h3>{course.title}</h3>
                      <p>{course.headline}</p>
                      <div className="course-stats">
                        <span>{course.duration}</span>
                        <span>{course.lessons} lessons</span>
                        <span>{course.rating} rating</span>
                      </div>
                      <div className="skill-row">
                        {course.skills.map((skill) => (
                          <span key={skill}>{skill}</span>
                        ))}
                      </div>
                      <div className="course-card-bottom">
                        <strong>{formatPrice(course.price)}</strong>
                        <div className="button-row">
                          <button type="button" className="ghost-button" onClick={() => setSelectedCourse(course)}>
                            View
                          </button>
                          <button
                            type="button"
                            className="primary-button"
                            disabled={actionLoading}
                            onClick={() => handleSaveCourse(course)}
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>

                <aside className="detail-card">
                  {selectedCourse ? (
                    <>
                      <div className="detail-banner" style={{ '--course-accent': selectedCourse.color }}>
                        <span>{selectedCourse.category}</span>
                        <h3>{selectedCourse.title}</h3>
                        <p>{selectedCourse.description}</p>
                      </div>
                      <div className="detail-meta">
                        <div>
                          <span>Instructor</span>
                          <strong>{selectedCourse.instructor}</strong>
                        </div>
                        <div>
                          <span>Students</span>
                          <strong>{selectedCourse.students}</strong>
                        </div>
                        <div>
                          <span>Price</span>
                          <strong>{formatPrice(selectedCourse.price)}</strong>
                        </div>
                      </div>
                      <div className="module-list">
                        {selectedCourse.modules.map((module) => (
                          <div key={module} className="module-item">
                            {module}
                          </div>
                        ))}
                      </div>
                      <div className="detail-actions">
                        <button
                          type="button"
                          className="primary-button"
                          disabled={actionLoading || selectedCourseSaved}
                          onClick={() => handleSaveCourse(selectedCourse)}
                        >
                          {selectedCourseSaved ? 'Saved already' : 'Save to learning list'}
                        </button>
                        <button
                          type="button"
                          className="ghost-button"
                          disabled={actionLoading || selectedCourseEnrolled}
                          onClick={() => handleEnroll(selectedCourse)}
                        >
                          {selectedCourseEnrolled ? 'Already enrolled' : 'Enroll now'}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="empty-state">Pick a course to see the full learning path.</div>
                  )}
                </aside>
              </div>
            )}
          </section>

          <aside className={activeView === 'workspace' ? 'panel panel-side active' : 'panel panel-side'}>
            <div className="panel-header">
              <div>
                <span className="eyebrow">Saved path</span>
                <h2>Learning list</h2>
              </div>
              <button type="button" className="ghost-button" onClick={handleClearLearningList}>
                Clear
              </button>
            </div>

            <div className="stacked-list">
              {learningList.length === 0 ? (
                <div className="empty-state">
                  Save a few courses from the catalog to shape a personal learning journey.
                </div>
              ) : (
                learningList.map((course) => (
                  <article key={course.course_id} className="list-card">
                    <div>
                      <h3>{course.title}</h3>
                      <p>{course.category}</p>
                    </div>
                    <strong>{formatPrice(course.price)}</strong>
                    <div className="button-row">
                      <button type="button" className="ghost-button" onClick={() => handleRemoveSavedCourse(course.course_id)}>
                        Remove
                      </button>
                      <button type="button" className="primary-button" onClick={() => handleEnroll(course)}>
                        Enroll
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>

            <div className="summary-panel">
              <span>Learning list value</span>
              <strong>{formatPrice(learningListTotal)}</strong>
            </div>
          </aside>
        </section>

        <section className={activeView === 'dashboard' ? 'dashboard-panel active' : 'dashboard-panel'}>
          <div className="panel-header">
            <div>
              <span className="eyebrow">Learner dashboard</span>
              <h2>Enrollments and momentum</h2>
            </div>
            <div className="dashboard-totals">
              <span>{enrollmentSummary.active} active</span>
              <span>{enrollmentSummary.completed} completed</span>
            </div>
          </div>

          <div className="dashboard-grid">
            <div className="dashboard-track">
              {enrollments.length === 0 ? (
                <div className="empty-state">
                  No enrollments yet. Enroll from the catalog or from the learning list to populate the dashboard.
                </div>
              ) : (
                enrollments.map((enrollment) => (
                  <article key={enrollment.id} className="enrollment-card">
                    <div className="enrollment-head">
                      <div>
                        <h3>{enrollment.course_title}</h3>
                        <p>{enrollment.instructor}</p>
                      </div>
                      <span className={enrollment.status === 'completed' ? 'status-dot done' : 'status-dot'}>
                        {enrollment.status}
                      </span>
                    </div>
                    <div className="progress-bar">
                      <span style={{ width: `${enrollment.progress}%` }} />
                    </div>
                    <div className="enrollment-footer">
                      <strong>{enrollment.progress}% complete</strong>
                      <button
                        type="button"
                        className="ghost-button"
                        disabled={actionLoading || enrollment.progress >= 100}
                        onClick={() => handleAdvanceProgress(enrollment)}
                      >
                        {enrollment.progress >= 100 ? 'Completed' : 'Advance +20%'}
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>

            <aside className="services-panel">
              <span className="eyebrow">Runtime health</span>
              <h3>Microservice signals</h3>
              <div className="service-list">
                {serviceStatus.map((service) => (
                  <div key={service.key} className="service-card">
                    <div className="service-title">
                      <strong>{service.key}</strong>
                      <span className={service.state === 'online' ? 'status-dot' : 'status-dot offline'}>
                        {service.state}
                      </span>
                    </div>
                    <p>
                      {service.state === 'online'
                        ? service.data.dependencies?.map((dependency) => `${dependency.name}: ${dependency.status}`).join(' | ') || 'No external dependencies'
                        : service.error}
                    </p>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
