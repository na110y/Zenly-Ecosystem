import { defineEventHandler } from 'h3'
import { handleAdminTotpSetup } from '../../../admin/handlers/totp-setup-handler'

export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event)
  return handleAdminTotpSetup(event, {
    databaseUrl: config.databaseUrl,
    totpEncryptionKey: config.totpEncryptionKey,
    issuer: 'Zenly Stories',
  })
})
