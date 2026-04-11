import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from './api/auth/[...nextauth]'

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions)
  return {
    redirect: {
      destination: session ? '/admin' : '/check',
      permanent: false,
    },
  }
}

export default function Index() { return null }
