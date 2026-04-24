// Minimal type declarations for the MercadoPago JS SDK v2 global.
// Only surfaces the handful of APIs we actually use — expand as needed.

// The Card Payment Brick passes the form data *directly* as the first arg
// to onSubmit — not wrapped in an outer object. Destructuring `{ formData }`
// here will leave you with undefined, triggering
//   "Cannot read properties of undefined (reading 'token')"
interface MPCardPaymentOnSubmitData {
  token: string
  payment_method_id: string
  issuer_id?: string
  installments?: number
  transaction_amount?: number
  payer?: {
    email?: string
    identification?: { type?: string; number?: string }
  }
}

interface MPCardPaymentBrick {
  unmount: () => void
}

interface MPBricksController {
  create: (
    brickType: 'cardPayment',
    containerId: string,
    settings: {
      initialization: { amount: number; payer?: { email?: string } }
      customization?: {
        paymentMethods?: { maxInstallments?: number }
        visual?: {
          style?: {
            theme?: 'default' | 'dark' | 'bootstrap' | 'flat'
            customVariables?: Record<string, string>
          }
        }
      }
      callbacks: {
        onReady?: () => void
        onSubmit: (data: MPCardPaymentOnSubmitData) => Promise<void>
        onError?: (error: unknown) => void
      }
    },
  ) => Promise<MPCardPaymentBrick>
}

interface MercadoPagoInstance {
  bricks: () => MPBricksController
}

interface MercadoPagoConstructor {
  new (publicKey: string, options?: { locale?: string }): MercadoPagoInstance
}

declare global {
  interface Window {
    MercadoPago?: MercadoPagoConstructor
  }
}

export {}
