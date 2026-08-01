from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from .ai_agent import run_autonomous_analysis, run_log_analysis_ai
from .log_parser import LogParser

class AnalyzeTargetView(APIView):
    permission_classes = [AllowAny] # Allowing any for easy testing right now

    def post(self, request):
        target = request.data.get('target')
        if not target:
            return Response({"error": "Target is required"}, status=400)
            
        try:
            # Trigger the AI autonomous workflow
            results = run_autonomous_analysis(target)
            return Response(results)
        except Exception as e:
            return Response({"error": str(e)}, status=500)

class LogAnalysisView(APIView):
    permission_classes = [AllowAny]
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def post(self, request):
        log_text = request.data.get('log_text')
        log_file = request.FILES.get('log_file')

        if not log_text and not log_file:
            return Response({"error": "Either log_text or log_file is required."}, status=400)

        if log_file:
            try:
                log_text = log_file.read().decode('utf-8', errors='ignore')
            except Exception as e:
                return Response({"error": f"Failed to read file: {str(e)}"}, status=400)

        if not log_text or not log_text.strip():
            return Response({"error": "Log content is empty."}, status=400)

        try:
            parser = LogParser(log_text)
            parsed_data = parser.parse()
            
            # Run AI synthesis
            ai_synthesis = run_log_analysis_ai(parsed_data)
            parsed_data["ai_analysis"] = ai_synthesis
            
            return Response(parsed_data, status=200)
        except Exception as e:
            return Response({"error": str(e)}, status=500)
