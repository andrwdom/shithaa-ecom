import { config } from './config.js'

console.log('Testing Backend Configuration...')
console.log('Config loaded successfully:', {
  port: config.port,
  nodeEnv: config.nodeEnv,
  vpsBaseUrl: config.vpsBaseUrl,
  heroImages: config.heroImages
})

console.log('✅ Configuration test passed!') 