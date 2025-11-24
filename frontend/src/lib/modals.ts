// Utility functions to replace alert() and confirm() globally
// These will be patched to use the ModalContext

let modalContext: { showAlert: any; showConfirm: any } | null = null

export function setModalContext(context: { showAlert: any; showConfirm: any }) {
  modalContext = context
}

export async function showCustomAlert(
  message: string, 
  options?: { 
    title?: string
    type?: 'success' | 'error' | 'info' | 'warning'
    icon?: string
  }
) {
  if (modalContext) {
    return await modalContext.showAlert({
      message,
      title: options?.title,
      type: options?.type || 'info',
      icon: options?.icon
    })
  } else {
    // Fallback to native alert
    alert(message)
  }
}

export async function showCustomConfirm(
  message: string,
  options?: {
    title?: string
    confirmText?: string
    cancelText?: string
    type?: 'danger' | 'warning' | 'info'
    icon?: string
  }
): Promise<boolean> {
  if (modalContext) {
    return await modalContext.showConfirm({
      message,
      title: options?.title,
      confirmText: options?.confirmText,
      cancelText: options?.cancelText,
      type: options?.type || 'warning',
      icon: options?.icon
    })
  } else {
    // Fallback to native confirm
    return confirm(message)
  }
}

