export interface CompositionLoaderCallbacks {
  onLoad: (json: string) => void
  onError: (error: Error) => void
}

export class CompositionLoader {
  readonly el: HTMLElement
  private textarea: HTMLTextAreaElement
  private errorDisplay: HTMLElement

  constructor(private callbacks: CompositionLoaderCallbacks) {
    this.el = document.createElement('div')
    this.el.className = 'composition-loader'

    const heading = document.createElement('h2')
    heading.textContent = 'Load Composition'

    this.textarea = document.createElement('textarea')
    this.textarea.className = 'composition-input'
    this.textarea.placeholder = 'Paste composition JSON here...'
    this.textarea.rows = 12

    const buttonRow = document.createElement('div')
    buttonRow.className = 'loader-buttons'

    const loadBtn = document.createElement('button')
    loadBtn.textContent = 'Load & Play'
    loadBtn.className = 'btn-primary'
    loadBtn.addEventListener('click', () => this.loadFromTextarea())

    const fileInput = document.createElement('input')
    fileInput.type = 'file'
    fileInput.accept = '.json'
    fileInput.style.display = 'none'
    fileInput.addEventListener('change', () => {
      const file = fileInput.files?.[0]
      if (file) this.loadFromFile(file)
    })

    const uploadBtn = document.createElement('button')
    uploadBtn.textContent = 'Upload File'
    uploadBtn.addEventListener('click', () => fileInput.click())

    buttonRow.append(loadBtn, uploadBtn, fileInput)

    this.errorDisplay = document.createElement('div')
    this.errorDisplay.className = 'loader-error'

    this.el.append(heading, this.textarea, buttonRow, this.errorDisplay)

    // Drag and drop
    this.el.addEventListener('dragover', (e) => {
      e.preventDefault()
      this.el.classList.add('drag-over')
    })
    this.el.addEventListener('dragleave', () => {
      this.el.classList.remove('drag-over')
    })
    this.el.addEventListener('drop', (e) => {
      e.preventDefault()
      this.el.classList.remove('drag-over')
      const file = e.dataTransfer?.files[0]
      if (file) this.loadFromFile(file)
    })
  }

  private loadFromTextarea(): void {
    const json = this.textarea.value.trim()
    if (!json) {
      this.showError('Please paste a composition JSON')
      return
    }
    this.clearError()
    this.callbacks.onLoad(json)
  }

  private loadFromFile(file: File): void {
    const reader = new FileReader()
    reader.onload = () => {
      const json = reader.result as string
      this.textarea.value = json
      this.clearError()
      this.callbacks.onLoad(json)
    }
    reader.onerror = () => {
      this.showError('Failed to read file')
    }
    reader.readAsText(file)
  }

  showError(message: string): void {
    this.errorDisplay.textContent = message
    this.errorDisplay.style.display = 'block'
  }

  clearError(): void {
    this.errorDisplay.textContent = ''
    this.errorDisplay.style.display = 'none'
  }
}
