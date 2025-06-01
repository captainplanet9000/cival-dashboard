import os
from langchain_google_genai import ChatGoogleGenerativeAI
# from langchain_openai import ChatOpenAI # Example for OpenAI as alternative
from dotenv import load_dotenv

# Construct the path to the .env file located in the parent directory (python-ai-services)
# __file__ is 'python-ai-services/agents/crew_llm_config.py'
# os.path.dirname(__file__) is 'python-ai-services/agents'
# os.path.join(os.path.dirname(__file__), '..') is 'python-ai-services'
# os.path.join(os.path.dirname(__file__), '..', '.env') is 'python-ai-services/.env'
dotenv_path = os.path.join(os.path.dirname(__file__), '..', '.env')
load_dotenv(dotenv_path=dotenv_path) 

# Centralized LLM Configuration for CrewAI agents
DEFAULT_LLM = None
ERROR_MSG = None # Stores any error message during LLM initialization

google_api_key = os.environ.get("GOOGLE_API_KEY")
# Example: For OpenAI, you might get it like this
# openai_api_key = os.environ.get("OPENAI_API_KEY") 

if google_api_key:
    try:
        # Using a common, generally available model. 
        # Users might need to adjust "gemini-1.5-flash-latest" if their key is for a different model
        # or if using a provider like OpenRouter that has specific model strings.
        DEFAULT_LLM = ChatGoogleGenerativeAI(
            model="gemini-1.5-flash-latest", 
            google_api_key=google_api_key,
            verbose=True, # Good for debugging
            temperature=0.5 # Adjust for desired creativity/determinism balance
            # convert_system_message_to_human=True # Useful for some models/prompt structures
        )
        print("LLM Config: Successfully initialized Google Gemini (gemini-1.5-flash-latest).")
    except Exception as e:
        print(f"LLM Config Error: Failed to initialize Google Gemini LLM. Error: {e}")
        ERROR_MSG = f"Google Gemini LLM initialization error: {e}"
else:
    no_key_msg = "GOOGLE_API_KEY not found in environment. Google Gemini LLM cannot be initialized."
    print(f"LLM Config Info: {no_key_msg}")
    if ERROR_MSG:
        ERROR_MSG += f"; {no_key_msg}"
    else:
        ERROR_MSG = no_key_msg

# Fallback example (commented out, but shows structure if you want to add OpenAI or others)
# if not DEFAULT_LLM and openai_api_key:
#     try:
#         DEFAULT_LLM = ChatOpenAI(api_key=openai_api_key, model_name="gpt-3.5-turbo")
#         print("LLM Config: Using OpenAI GPT-3.5 Turbo as fallback.")
#         ERROR_MSG = None # Clear previous error if fallback succeeds
#     except Exception as e:
#         print(f"LLM Config Error: Failed to initialize OpenAI LLM. Error: {e}")
#         if ERROR_MSG: ERROR_MSG += f"; OpenAI LLM also failed: {e}"
#         else: ERROR_MSG = f"OpenAI LLM initialization error: {e}"

if not DEFAULT_LLM and not ERROR_MSG: # If no keys were found at all initially
    ERROR_MSG = "No LLM API keys found (GOOGLE_API_KEY or others for fallback). LLM cannot be initialized."
    print(f"LLM Config Error: {ERROR_MSG}")
elif not DEFAULT_LLM and ERROR_MSG: # If there was an attempt but it failed
    # ERROR_MSG already contains the specific error
    print(f"LLM Config Error: LLM initialization failed. Details: {ERROR_MSG}")

# Store configured LLMs
CONFIGURED_LLMS = {}
if DEFAULT_LLM:
    # Attempt to get a model_name or a generic identifier
    # For ChatGoogleGenerativeAI, it's in `model` (as passed to constructor) or `model_name`
    # For ChatOpenAI, it's often `model_name`
    llm_model_name = getattr(DEFAULT_LLM, 'model', None) or \
                     getattr(DEFAULT_LLM, 'model_name', None)
    if llm_model_name:
        CONFIGURED_LLMS[llm_model_name] = DEFAULT_LLM
    else: # Fallback if no obvious model name attribute
        if isinstance(DEFAULT_LLM, ChatGoogleGenerativeAI):
             CONFIGURED_LLMS["default_gemini_llm"] = DEFAULT_LLM
        # Add more specific fallbacks if other LLM types are used
        else:
             CONFIGURED_LLMS["default_llm"] = DEFAULT_LLM


def get_available_llm_identifiers() -> List[str]:
    """Returns a list of identifiers for the configured LLMs."""
    return list(CONFIGURED_LLMS.keys())


def get_llm():
    """
    Returns the configured LLM instance.
    Raises EnvironmentError if the LLM could not be initialized.
    """
    if DEFAULT_LLM:
        return DEFAULT_LLM
    else:
        # Provide a clear error message if get_llm() is called when no LLM is available
        raise EnvironmentError(f"LLM not initialized or initialization failed. Error: {ERROR_MSG}")

# Example of how to test this file directly (optional)
if __name__ == '__main__':
    print("\n--- LLM Configuration Test ---")
    try:
        llm_instance = get_llm()
        print(f"Successfully retrieved LLM instance: {type(llm_instance).__name__}")
        if hasattr(llm_instance, 'model_name'): # For Langchain based models
             print(f"Model name: {llm_instance.model_name}")
        
        # Test invocation (requires a valid API key to be set in .env)
        # if google_api_key:
        #     print("\nAttempting a simple invocation (requires GOOGLE_API_KEY to be set and valid)...")
        #     try:
        #         response = llm_instance.invoke("Explain the concept of a language model in one sentence.")
        #         print(f"LLM Test Response: {response.content}")
        #     except Exception as e:
        #         print(f"LLM Test Invocation Error: {e}")
        # else:
        #     print("\nSkipping LLM test invocation as GOOGLE_API_KEY is not set.")

    except EnvironmentError as e:
        print(f"LLM Test Error: {e}")
    except Exception as e:
        print(f"An unexpected error occurred during LLM configuration test: {e}")
    
    print("\nAvailable LLM Identifiers:")
    print(get_available_llm_identifiers())
    print("--- End LLM Configuration Test ---\n")
