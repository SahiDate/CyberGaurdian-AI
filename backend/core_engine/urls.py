from django.urls import path
from .views import AnalyzeTargetView, LogAnalysisView

urlpatterns = [
    path('analyze/', AnalyzeTargetView.as_view(), name='analyze_target'),
    path('analyze-logs/', LogAnalysisView.as_view(), name='analyze_logs'),
]
