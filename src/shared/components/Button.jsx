
function Button({ children, loading, loadingText, ...rest }) {
  return (
    <button
      {...rest}
      disabled={loading || rest.disabled}
      className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
    >
      {loading ? loadingText : children}
    </button>
  )
}

export default Button