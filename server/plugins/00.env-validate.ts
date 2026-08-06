import { bootstrapEnv } from '../env/bootstrap'

export default defineNitroPlugin(() => {
  bootstrapEnv()
})
