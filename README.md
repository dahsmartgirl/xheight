# x-height

> **Turn your handwriting into font.**

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-19-61DAFB.svg?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6.svg?logo=typescript)
![Tailwind](https://img.shields.io/badge/Tailwind-3.0-38B2AC.svg?logo=tailwind-css)

**x-height** is a beautiful, client-side web application that lets you transform your unique handwriting into a functional digital font (`.ttf`) in minutes. Designed with a focus on aesthetics, typography, and ease of use.

---

## ✨ Features

- **✍️ Digital Canvas:** Draw characters seamlessly using your mouse, trackpad, or stylus. Optimized for touch devices.
- **🌗 Theme Aware:** Fully supported Dark Mode and Light Mode with smooth transitions.
- **👁️ Real-time Preview:** Type and test your font instantly as you draw. Adjust letter spacing and font size on the fly.
- **🧘 Zen Mode:** A distraction-free grid for rapid character input.
- **💾 Local Persistence:** Your progress is saved automatically to your browser's local storage. Never lose a stroke.
- **📦 Export Options:**
  - **Single Weight:** Export a standard `.ttf` file.
  - **Font Family:** Export a `.zip` containing Regular, Bold, and Italic variants (algorithmically generated).
- **📱 Responsive:** A fluid interface that works perfectly on desktop and mobile.

## 🛠️ Tech Stack

*   **Framework:** React 19
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS
*   **Font Generation:** `opentype.js`
*   **Icons:** Lucide React
*   **Utils:** `jszip`

## 🚀 Getting Started

To run this project locally:

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/x-height.git
    cd x-height
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Start the development server**
    ```bash
    npm run dev
    ```

4.  Open your browser to `http://localhost:5173` (or the port shown in your terminal).

## 📖 How to Use

1.  **Draw:** Select a character from the grid or use the sidebar navigation. Draw the glyph in the canvas area.
2.  **Edit:** Use Undo/Redo/Clear tools to perfect your strokes.
3.  **Preview:** Switch to the "Preview" tab to type sentences and see your handwriting come to life as a font.
4.  **Download:** Click the "Download" button in the header. Name your font and choose between a single `.ttf` or a full Family `.zip`.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1.  Fork the project
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

##  Credits

Made with ♡ by [Ileri](https://x.com/dahsmartgirl).
