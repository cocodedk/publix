import { useState } from 'react'
import axios, { AxiosError } from 'axios'
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Box,
  Paper,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Link,
} from '@mui/material'
import SecurityIcon from '@mui/icons-material/Security'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

type State = 'idle' | 'loading' | 'sent' | 'error'

interface ApiError {
  error?: string
  message?: string
  retryAfter?: number
}

export default function CheckPage() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<State>('idle')
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    setState('loading')
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const { data } = await axios.post<{ message: string; tier: string }>(
        '/api/report',
        { email }
      )
      setSuccessMessage(data.message)
      setState('sent')
    } catch (err) {
      const axiosErr = err as AxiosError<ApiError>
      const responseData = axiosErr.response?.data
      if (axiosErr.response?.status === 429) {
        const secs = responseData?.retryAfter ?? 300
        setErrorMessage(
          `Too many requests. Please try again in ${secs} seconds.`
        )
      } else {
        setErrorMessage(
          responseData?.message ??
            responseData?.error ??
            'Something went wrong. Please try again.'
        )
      }
      setState('error')
    }
  }

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Publix
          </Typography>
          <Link href="/auth/signin" color="inherit" sx={{ textDecoration: 'none' }}>
            Sign in
          </Link>
        </Toolbar>
      </AppBar>

      <Container maxWidth="sm">
        <Box
          sx={{
            minHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            py: 6,
          }}
        >
          <SecurityIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />

          <Typography variant="h4" component="h1" align="center" gutterBottom>
            Have you been breached?
          </Typography>

          <Typography
            variant="body1"
            align="center"
            color="text.secondary"
            sx={{ mb: 4, maxWidth: 440 }}
          >
            Enter your email. We check it against known breaches and send you a
            private report.
          </Typography>

          <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
            {state === 'sent' ? (
              <Alert severity="success" sx={{ mb: 2 }}>
                {successMessage}
              </Alert>
            ) : (
              <form onSubmit={handleSubmit}>
                <TextField
                  label="Email address"
                  type="email"
                  value={email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                  fullWidth
                  required
                  disabled={state === 'loading'}
                  sx={{ mb: 2 }}
                />
                {state === 'error' && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {errorMessage}
                  </Alert>
                )}
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  fullWidth
                  disabled={state === 'loading' || !email.trim()}
                >
                  {state === 'loading' ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    'Check my email'
                  )}
                </Button>
              </form>
            )}
          </Paper>

          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              Powered by{' '}
              <Link
                href="https://leakcheck.io"
                target="_blank"
                rel="noopener noreferrer"
              >
                LeakCheck
              </Link>
              {' · '}
              <Link href="/privacy">Privacy policy</Link>
              {' · '}
              <Link href="/auth/signin">Upgrade for deeper search</Link>
            </Typography>
          </Box>
        </Box>
      </Container>

      <ToastContainer position="bottom-right" autoClose={3000} />
    </>
  )
}
