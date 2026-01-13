# Learning Hub - Tutorial Content

**Version:** 2.0.0
**Author:** Andrew Gotora
**Email:** [andrewgotora@yahoo.com](mailto:andrewgotora@yahoo.com)
**Last Updated**: January 9, 2026

## Tutorial 1: Getting Started with SAP BTP Trial

**Difficulty**: Beginner | **Duration**: 15 minutes

### Overview
Learn how to set up your SAP Business Technology Platform (BTP) trial account and provision the necessary AI services to begin your AI journey.

### What You'll Learn
- Creating a SAP BTP trial account
- Navigating the SAP BTP cockpit
- Understanding the global account and subaccount structure
- Provisioning AI services (AI Core, Generative AI Hub)

### Step-by-Step Guide

**Step 1: Create Your SAP BTP Trial Account**
Visit https://account.hanatrial.ondemand.com and click "Register". Follow the registration process with your email. You'll receive a confirmation email - click the verification link to activate your account.

**Step 2: Access the SAP BTP Cockpit**
Log in to your trial account. You'll see the SAP BTP Cockpit dashboard. This is your central hub for managing cloud resources.

**Step 3: Explore Your Global Account**
In the cockpit, you have a "Global Account" which is your top-level container. Within this, you'll have one or more "Subaccounts" (your trial includes one pre-configured subaccount).

**Step 4: Navigate to Your Subaccount**
Click on your subaccount to enter it. Here you can manage services, applications, and users.

**Step 5: Enable AI Services**
Go to "Services" → "Service Marketplace". Search for "AI Core" and click "Create". Select the appropriate plan (free tier for trials). Repeat for "Generative AI Hub".

**Step 6: Verify Provisioning**
Wait 2-3 minutes for services to provision. Go to "Instances and Subscriptions" to confirm both services are active.

### Key Concepts
- **Global Account**: Your top-level container in SAP BTP
- **Subaccount**: A logical grouping of resources within your global account
- **Service Marketplace**: Where you discover and provision SAP BTP services
- **Instances**: Running instances of services you've provisioned

### Next Steps
Once your AI services are provisioned, proceed to Tutorial 2 to explore the Generative AI Hub.

---

## Tutorial 2: Exploring the Generative AI Hub Playground

**Difficulty**: Beginner | **Duration**: 20 minutes

### Overview
Discover the Generative AI Hub and learn how to interact with Large Language Models (LLMs) through an intuitive playground interface.

### What You'll Learn
- Accessing the Generative AI Hub
- Understanding available LLMs (GPT-4, Claude, etc.)
- Crafting effective prompts
- Using the playground for experimentation

### Step-by-Step Guide

**Step 1: Access the Generative AI Hub**
From your SAP BTP subaccount, go to "Instances and Subscriptions". Find "Generative AI Hub" and click the link to open it.

**Step 2: Explore Available Models**
In the hub, you'll see a list of available LLMs. Each has different strengths:
- **GPT-4**: Excellent for general-purpose tasks, creative writing, and complex reasoning
- **Claude**: Strong at analysis, coding, and nuanced conversations
- **SAP-specific models**: Optimized for ABAP code generation and business analytics

**Step 3: Select a Model**
Choose "GPT-4" for this exercise. Click "Create New Prompt" to start experimenting.

**Step 4: Write Your First Prompt**
Try this prompt: "Explain how SAP BTP AI Core can help a retail business optimize inventory management."

Click "Execute" and observe the response. The model will generate a comprehensive answer in seconds.

**Step 5: Refine Your Prompt**
Experiment with different prompt styles:
- **Specific**: "Write a Python script that connects to SAP BTP AI Core using the REST API."
- **Contextual**: "As a SAP solution architect, explain the benefits of using AI Foundation for enterprise applications."
- **Structured**: "Create a JSON schema for a customer sentiment analysis API using SAP BTP."

**Step 6: Explore Prompt Templates**
The hub provides pre-built templates for common tasks. Browse "Templates" to see examples like "Code Generation", "Data Analysis", and "Business Writing".

### Best Practices for Prompting
- **Be Specific**: Clear, detailed prompts produce better results
- **Provide Context**: Tell the model your use case and requirements
- **Iterate**: Refine prompts based on responses to improve quality
- **Use Examples**: Show the model what you want with examples (few-shot prompting)

### Key Concepts
- **LLM (Large Language Model)**: An AI model trained on vast amounts of text data
- **Prompt**: The input text you provide to the model
- **Token**: A unit of text (roughly 4 characters) that the model processes
- **Temperature**: Controls randomness in responses (0 = deterministic, 1 = creative)

### Next Steps
Learn how to integrate the Generative AI Hub into your applications in Tutorial 3.

---

## Tutorial 3: Building a RAG Solution with SAP BTP

**Difficulty**: Intermediate | **Duration**: 45 minutes

### Overview
Create a Retrieval-Augmented Generation (RAG) solution that combines your business data with LLM capabilities to provide contextual, accurate answers.

### What You'll Learn
- Understanding RAG architecture
- Setting up a document repository
- Integrating SAP Document AI for extraction
- Querying with business context

### Architecture Overview
A RAG system has three main components:
1. **Document Store**: Your business documents (PDFs, Word files, etc.)
2. **Embedding Service**: Converts documents into numerical vectors for similarity search
3. **LLM**: Generates answers based on retrieved documents

### Step-by-Step Guide

**Step 1: Prepare Your Documents**
Gather business documents (e.g., product manuals, policy documents, FAQ files). Upload them to your SAP BTP storage or document repository.

**Step 2: Extract Information with SAP Document AI**
Go to "SAP Document AI" service in your subaccount. Upload a sample document (e.g., an invoice or contract). The service will extract key information like:
- Entity names (customer, vendor)
- Amounts and dates
- Document type and classification

**Step 3: Create Embeddings**
Use the Generative AI Hub to create embeddings of your documents. This converts text into numerical vectors that capture semantic meaning.

**Step 4: Build Your Query Interface**
Create a simple interface where users can ask questions. The system will:
1. Convert the question into an embedding
2. Search your document store for similar content
3. Pass relevant documents to the LLM
4. Generate an answer based on your business context

**Step 5: Test Your RAG System**
Ask questions like:
- "What is our return policy for electronics?"
- "Who is the primary contact for vendor ABC?"
- "What are the payment terms in our standard contract?"

The system should retrieve relevant documents and provide accurate answers.

### Code Example (Pseudo-code)
```python
# 1. Retrieve relevant documents
query = "What is our return policy?"
query_embedding = create_embedding(query)
relevant_docs = search_documents(query_embedding, top_k=3)

# 2. Build context for LLM
context = "\n".join([doc.content for doc in relevant_docs])

# 3. Generate answer
prompt = f"Based on this context:\n{context}\n\nAnswer: {query}"
answer = call_llm(prompt, model="gpt-4")

print(answer)
```

### Best Practices
- **Quality Documents**: Ensure your document store is well-organized and up-to-date
- **Relevance Tuning**: Adjust the number of retrieved documents (top_k) based on quality
- **Prompt Engineering**: Craft prompts that clearly instruct the LLM how to use the context
- **Monitoring**: Track query success rates and user feedback to improve the system

### Key Concepts
- **RAG (Retrieval-Augmented Generation)**: Combining retrieval and generation for context-aware answers
- **Embedding**: A numerical representation of text that captures semantic meaning
- **Vector Search**: Finding similar documents based on embedding similarity
- **Prompt Context**: Providing relevant information to the LLM for better answers

### Next Steps
Learn how to deploy your RAG solution as a production application in Tutorial 4.

---

## Tutorial 4: Creating AI Agents with Joule Studio

**Difficulty**: Intermediate | **Duration**: 50 minutes

### Overview
Build intelligent AI agents that can perform multi-step tasks, make decisions, and interact with SAP systems autonomously.

### What You'll Learn
- Understanding AI agent architecture
- Building agents with Joule Studio
- Defining agent skills and workflows
- Testing and deploying agents

### Agent Architecture
An AI agent consists of:
- **Perception**: Understanding user input and context
- **Reasoning**: Deciding what actions to take
- **Action**: Executing tasks (API calls, database queries, etc.)
- **Learning**: Improving from feedback

### Step-by-Step Guide

**Step 1: Access Joule Studio**
From your SAP BTP subaccount, navigate to "Joule Studio in SAP Build". This is where you design and build AI agents.

**Step 2: Create a New Agent**
Click "Create Agent". Name it "Customer Support Agent". This agent will help respond to customer inquiries.

**Step 3: Define Agent Skills**
Skills are specific capabilities your agent can perform. Add these skills:
- **Retrieve Customer Info**: Fetch customer details from your CRM
- **Check Order Status**: Query order database
- **Process Refund**: Initiate refund workflows
- **Escalate to Human**: Hand off complex issues to support staff

**Step 4: Build the Agent Workflow**
Define how your agent responds to customer queries:
1. User asks: "Where is my order?"
2. Agent calls "Retrieve Customer Info" skill
3. Agent calls "Check Order Status" skill
4. Agent generates a natural language response

**Step 5: Configure Integrations**
Connect your agent to SAP systems:
- SAP S/4HANA for order and customer data
- SAP SuccessFactors for employee information
- Custom APIs for business logic

**Step 6: Test Your Agent**
Use the built-in chat interface to test your agent:
- "I want to return my order"
- "Can you update my delivery address?"
- "What's my loyalty points balance?"

**Step 7: Deploy to Production**
Once tested, deploy your agent. It can be accessed via:
- Web chat interface
- Mobile app
- Integration with SAP Fiori apps

### Example Agent Conversation
```
User: "I haven't received my order yet. Order ID: 12345"

Agent: [Calls Retrieve Customer Info and Check Order Status skills]
Agent: "I found your order #12345. It was shipped on Jan 3rd and is currently in transit with FedEx. 
Expected delivery is Jan 6th. You can track it here: [tracking link]. 
Is there anything else I can help with?"

User: "Can I change the delivery address?"

Agent: "Unfortunately, your order is already in transit and cannot be rerouted. 
However, you can refuse delivery and have it returned for reshipping to a different address. 
Would you like me to process that?"
```

### Best Practices
- **Clear Skill Definitions**: Each skill should have a single, well-defined purpose
- **Error Handling**: Design fallbacks for when skills fail
- **User Feedback**: Collect feedback to improve agent responses
- **Regular Updates**: Keep your agent trained on new business processes

### Key Concepts
- **AI Agent**: An autonomous system that perceives, reasons, and acts
- **Skill**: A discrete capability an agent can execute
- **Workflow**: The sequence of steps an agent follows
- **Integration**: Connecting agents to enterprise systems

### Next Steps
Learn about automating document processing with SAP Document AI in Tutorial 5.

---

## Tutorial 5: Automating Document Processing with SAP Document AI

**Difficulty**: Intermediate | **Duration**: 40 minutes

### Overview
Automate the extraction and classification of information from business documents using machine learning and AI.

### What You'll Learn
- Understanding document processing challenges
- Using SAP Document AI for extraction
- Building document classification workflows
- Integrating with business processes

### Document Processing Workflow
1. **Capture**: Scan or upload documents
2. **Classify**: Identify document type (invoice, receipt, contract, etc.)
3. **Extract**: Pull out key information (amounts, dates, names)
4. **Validate**: Verify accuracy and completeness
5. **Route**: Send to appropriate systems or workflows

### Step-by-Step Guide

**Step 1: Access SAP Document AI**
From your SAP BTP subaccount, open the "SAP Document AI" service.

**Step 2: Upload Sample Documents**
Upload 5-10 sample documents of different types:
- Invoices
- Purchase orders
- Contracts
- Receipts

**Step 3: Train the Extraction Model**
For each document type, manually highlight key fields:
- Vendor/Customer name
- Invoice/Order number
- Amount
- Date
- Line items

The AI learns from these examples to automatically extract similar information from new documents.

**Step 4: Test Extraction Accuracy**
Upload new documents and verify that the AI correctly extracts:
- Document type classification accuracy
- Field extraction accuracy
- Confidence scores for each extraction

**Step 5: Configure Output Format**
Define how extracted data should be formatted:
- JSON for API integration
- CSV for spreadsheet import
- XML for enterprise systems

**Step 6: Integrate with Your Workflow**
Connect document processing to your business processes:
- Auto-create invoices in SAP S/4HANA
- Trigger approval workflows
- Update inventory based on purchase orders

### Code Example (Pseudo-code)
```python
# Upload and process a document
document_path = "invoice_sample.pdf"
result = document_ai.process_document(document_path)

# Extract key information
invoice_number = result.extract_field("invoice_number")
vendor_name = result.extract_field("vendor_name")
total_amount = result.extract_field("total_amount")
line_items = result.extract_table("line_items")

# Create invoice in SAP
sap_invoice = {
    "document_number": invoice_number,
    "vendor": vendor_name,
    "amount": total_amount,
    "items": line_items
}
create_invoice_in_sap(sap_invoice)
```

### Business Impact
- **Time Savings**: Reduce manual data entry by 80%
- **Accuracy**: Minimize human errors in data extraction
- **Scalability**: Process thousands of documents automatically
- **Cost Reduction**: Lower operational costs through automation

### Key Concepts
- **Document Classification**: Identifying document type automatically
- **Field Extraction**: Pulling specific information from documents
- **Confidence Score**: Measure of extraction accuracy
- **Training Data**: Examples used to teach the AI model

### Next Steps
Explore advanced topics like building custom AI models in Tutorial 6.

---

## Tutorial 6: Advanced Topics - Building Custom AI Models

**Difficulty**: Advanced | **Duration**: 60 minutes

### Overview
Learn how to build and deploy custom machine learning models on SAP BTP for specialized business use cases.

### What You'll Learn
- SAP AI Core architecture
- Model development workflow
- Deploying models for inference
- Monitoring and managing models

### SAP AI Core Components
- **AI Runtime**: Execution environment for your models
- **AI Launchpad**: Management interface for models
- **Model Registry**: Centralized repository for models
- **Inference Service**: API for running predictions

### Step-by-Step Guide

**Step 1: Understand the Model Development Lifecycle**
1. **Preparation**: Gather and prepare training data
2. **Development**: Build and train your model
3. **Evaluation**: Test model performance
4. **Deployment**: Deploy to AI Core
5. **Monitoring**: Track performance in production

**Step 2: Prepare Your Training Data**
Collect historical data relevant to your use case. For example, if building a customer churn prediction model:
- Customer demographics
- Purchase history
- Support tickets
- Previous churn outcomes

**Step 3: Develop Your Model**
Using Python and scikit-learn or TensorFlow:
```python
from sklearn.ensemble import RandomForestClassifier
import pandas as pd

# Load training data
data = pd.read_csv("customer_data.csv")
X = data[['age', 'tenure', 'monthly_charges', 'support_tickets']]
y = data['churned']

# Train model
model = RandomForestClassifier(n_estimators=100)
model.fit(X, y)

# Save model
model.save("churn_model.pkl")
```

**Step 4: Deploy to SAP AI Core**
Create a deployment configuration:
```yaml
apiVersion: ai.sap.com/v1
kind: Model
metadata:
  name: customer-churn-model
spec:
  image: my-registry/churn-model:v1
  replicas: 2
  resources:
    requests:
      memory: "2Gi"
      cpu: "1"
```

**Step 5: Create an Inference API**
Expose your model through a REST API:
```python
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/predict', methods=['POST'])
def predict():
    data = request.json
    prediction = model.predict([data['features']])
    return jsonify({'churn_probability': float(prediction[0])})
```

**Step 6: Monitor Model Performance**
Track key metrics:
- Prediction accuracy
- Response time
- Error rate
- Model drift (performance degradation over time)

### Best Practices
- **Data Quality**: Ensure training data is clean and representative
- **Version Control**: Track model versions and training parameters
- **Testing**: Thoroughly test before production deployment
- **Monitoring**: Continuously monitor performance and retrain as needed

### Key Concepts
- **Model Training**: Teaching an AI model using historical data
- **Feature Engineering**: Creating meaningful inputs for your model
- **Model Evaluation**: Measuring model performance on test data
- **Inference**: Using a trained model to make predictions

### Next Steps
Explore production deployment and scaling in the SAP BTP documentation.
