"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Calendar, Clock, Zap, CheckCircle2, AlertTriangle,
  RefreshCw, Check, Award, Sparkles, Moon, Settings, X,
} from "lucide-react";
import { API_URL, fetchWithAuth, getUserEmail } from "@/lib/api";
import Sidebar from "@/components/Sidebar";