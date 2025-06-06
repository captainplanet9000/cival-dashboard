import pkgutil, pathlib
__path__ = pkgutil.extend_path(__path__, __name__)
_orig_path = pathlib.Path(__file__).resolve().parent.parent / 'python-ai-services'
__path__.append(str(_orig_path))
