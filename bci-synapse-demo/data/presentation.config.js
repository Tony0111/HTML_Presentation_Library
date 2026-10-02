window.PRESENTATION_CONFIG = {
  presentation: {
    title: "Synapse Field",
    subtitle: "A visual study of brain-computer interfaces",
    author: "Illustrative signal system",
    date: "2026",
    theme: "cortical-current"
  },
  themes: {
    "cortical-current": {
      background: "#05080d",
      primary: "#46e7ff",
      secondary: "#c8ff65",
      highlight: "#ff7a6e",
      arcRadius: 8.8,
      stepAngle: 0.49
    }
  },
  chapters: [
    {
      number: "01",
      kicker: "CHAPTER ONE / LISTENING",
      title: "FIND THE SIGNAL",
      summary: "输入不是一条干净指令，而是一片需要被辨认的活动。",
      palette: ["#46e7ff", "#0a2732", "#050d14"],
      motif: "electrodes",
      readout: "SNR / 12.8 dB",
      metric: "noise floor falling",
      pages: [
        {
          label: "01 / SIGNAL WINDOW",
          title: "SIGNAL WINDOW",
          body: "三十二个电极观察着一片不断变化的活动场，直到一条可用的信号开始浮现。",
          readout: "WINDOW / 480 ms",
          metric: "PATTERN DETECTED",
          note: "可用的信号，最初只是与噪声之间一个很小的差异。"
        },
        {
          label: "02 / THE READOUT",
          title: "EXTRACT THE RHYTHM",
          body: "系统不会把整片活动变得安静，而是保留那些反复出现、可以继续追踪的节奏。",
          readout: "CHANNELS / 32",
          metric: "READOUT STABILITY 0.82",
          note: "这里的数值只展示提取关系，不代表临床测量。"
        },
        {
          label: "03 / KEEP THE TRACE",
          title: "A SIGNAL TO CARRY",
          body: "当一条信号能够穿过噪声，它才有机会成为下一次判断的桥梁。",
          readout: "INPUT / SIGNAL",
          metric: "NOISE FLOOR FALLING",
          note: "倾听，是建立一个接口的第一个动作。"
        },
        {
          label: "04 / SIGNAL WINDOW",
          title: "A SIGNAL TO CARRY",
          body: "当一个变化能够被重复辨认，它才有机会进入下一步处理。",
          readout: "CLARITY / 0.82",
          metric: "SIGNAL WINDOW STABLE",
          note: "清晰度只表示可继续处理，不表示已经完全理解。",
          visual: "signal-window"
        },
        {
          label: "05 / LISTENING IS ACTION",
          title: "LISTENING IS ACTION",
          body: "倾听不是等待答案，而是主动决定什么值得继续。",
          readout: "NEXT / DECODING",
          metric: "TRACE RETAINED",
          note: "下一章：让信号获得方向。",
          visual: "signal-takeaway"
        }
      ]
    },
    {
      number: "02",
      kicker: "CHAPTER TWO / DECODING",
      title: "MAKE INTENT LEGIBLE",
      summary: "解码把分散的轨迹收束为可以检查的方向，而不是不可解释的结果。",
      palette: ["#c8ff65", "#183323", "#071109"],
      motif: "decoding",
      readout: "INTENT / MOVE",
      metric: "trajectory confidence 86%",
      pages: [
        {
          label: "01 / PATTERN",
          title: "A PATTERN EMERGES",
          body: "分散的点云开始围绕系统反复观察到的变化弯曲，形成可以被追踪的形状。",
          readout: "LATENT FIELD / 64D",
          metric: "TRAJECTORIES UNFOLD",
          note: "解码器先观察形状，再尝试为它命名。"
        },
        {
          label: "02 / INTENT",
          title: "INTENT GAINS WEIGHT",
          body: "三个可能的方向把同一组信号拉向不同的未来：移动、选择和停留。",
          readout: "CLASS / MOVE",
          metric: "CONFIDENCE GATHERING",
          note: "概率被表现为一个吸引场，而不是一个承诺。"
        },
        {
          label: "03 / CHOICE",
          title: "CHOICE BECOMES VISIBLE",
          body: "界面在动作真正发生之前展示候选决定，让使用者仍然有机会改变方向。",
          readout: "ILLUSTRATIVE / 86%",
          metric: "INTENT / MOVE",
          note: "可见的选择，让人始终留在循环之内。"
        },
        {
          label: "04 / CHOICE",
          title: "THE DECODER LENS",
          body: "好的解码器不是替人决定，而是把可能的方向照亮。",
          readout: "CONFIDENCE / ILLUSTRATIVE",
          metric: "CHOICE REMAINS VISIBLE",
          note: "下一章：把结果送回感知，形成闭环。",
          visual: "decoder-lens"
        },
        {
          label: "05 / HANDOFF",
          title: "FROM SIGNAL TO CHOICE",
          body: "当候选方向被看见，系统才有机会把决定交还给人。",
          readout: "HANDOFF / READY",
          metric: "HUMAN IN THE LOOP",
          note: "解码的终点，是一次可以被检查的交接。",
          visual: "decoder-takeaway"
        }
      ]
    },
    {
      number: "03",
      kicker: "CHAPTER THREE / THE LOOP",
      title: "RETURN THE FEEDBACK",
      summary: "接口不是单向管道，而是一条会回到起点的反馈路径。",
      palette: ["#ff7a6e", "#3b171b", "#10080b"],
      motif: "feedback",
      readout: "LOOP / CLOSED",
      metric: "latency 42 ms",
      pages: [
        {
          label: "01 / READ",
          title: "LISTEN FIRST",
          body: "闭环从倾听开始，一条信号进入之后，系统才开始判断它可能意味着什么。",
          readout: "LOOP PHASE / 01",
          metric: "READ",
          note: "每一次反馈，都从再次倾听开始。"
        },
        {
          label: "02 / INTERPRET",
          title: "RETURN A RESPONSE",
          body: "珊瑚色光带把解释送回原来的信号场，反馈成为下一轮读取的条件。",
          readout: "LATENCY / 42 ms",
          metric: "INTERPRET",
          note: "反馈是信号的一部分，不是信号的终点。"
        },
        {
          label: "03 / RETURN",
          title: "CHANGE WHAT COMES NEXT",
          body: "闭环让每一次反馈都影响下一次读取，使接口逐渐接近当下的人。",
          readout: "LOOP / CLOSED",
          metric: "RETURN",
          note: "系统给出的反馈，会改变它下一次能够读到的内容。"
        },
        {
          label: "04 / RETURN",
          title: "A SENSE OF RETURN",
          body: "反馈返回之后，下一次读取已经处在不同的条件里。",
          readout: "CYCLE / READ - RETURN",
          metric: "LOOP STATE REPEATING",
          note: "变化来自循环本身，而不是某一个孤立的瞬间。",
          visual: "loop-readout"
        },
        {
          label: "05 / TAKEAWAY",
          title: "THE LOOP CHANGES THE NEXT",
          body: "真正的反馈，不是替人完成，而是让下一次协作更接近当下的人。",
          readout: "NEXT / ADAPTATION",
          metric: "RESPONSE RETURNED",
          note: "下一章：同一套接口如何逐渐贴合不同的人。",
          visual: "loop-takeaway"
        }
      ]
    },
    {
      number: "04",
      kicker: "CHAPTER FOUR / ADAPTING",
      title: "LEARN ONE PERSON",
      summary: "适配从承认差异开始，让系统逐渐贴合一个人的节奏。",
      palette: ["#46e7ff", "#12333d", "#071116"],
      motif: "adapting",
      readout: "FIT / 3 SESSIONS",
      metric: "calibration curve converging",
      pages: [
        {
          label: "01 / SESSION 01",
          title: "START WITH A DIFFERENCE",
          body: "第一次会话建立的是一个参考范围，而不是关于这个人的最终结论。",
          readout: "CALIBRATION / 01",
          metric: "REFERENCE ESTABLISHED",
          note: "适配从默认答案不再足够的地方开始。"
        },
        {
          label: "02 / SESSION 02",
          title: "FOLLOW THE CURVE",
          body: "随着会话继续，模型逐渐靠近一个人的节奏，但不会抹掉属于他的偏移。",
          readout: "CALIBRATION / 02",
          metric: "ERROR DECREASING",
          note: "曲线记录的是注意力变化，不是对一个人的评分。"
        },
        {
          label: "03 / SESSION 03",
          title: "LEARN ONE PERSON",
          body: "最后的曲线并不消除差异，而是为差异留下被读懂的空间。",
          readout: "FIT / 3 SESSIONS",
          metric: "CALIBRATION CONVERGING",
          note: "个体化只有在保留人的可读性时才有价值。"
        },
        {
          label: "04 / THE PERSONAL BASELINE",
          title: "THE PERSONAL BASELINE",
          body: "第三次会话显示的是趋近，而不是完美；变化的趋势比单个数字更重要。",
          readout: "SESSION / 01 - 03",
          metric: "CALIBRATION CONVERGING",
          note: "示意数据 / 非临床测量。",
          visual: "personal-baseline"
        },
        {
          label: "05 / TAKEAWAY",
          title: "ADAPTATION IS MEMORY",
          body: "适配的价值，不是抹平差异，而是记住哪些差异值得被尊重。",
          readout: "NEXT / BOUNDARY",
          metric: "PERSON REMAINS LEGIBLE",
          note: "下一章：当接口越来越强，边界应该放在哪里？",
          visual: "adaptation-takeaway"
        }
      ]
    },
    {
      number: "05",
      kicker: "CHAPTER FIVE / BEYOND THE SIGNAL",
      title: "DESIGN THE BOUNDARY",
      summary: "接口越接近人的意图，边界就越需要被看见。",
      palette: ["#c8ff65", "#1b3026", "#07100d"],
      motif: "boundary",
      readout: "FIELD / OPEN",
      metric: "human agency retained",
      pages: [
        {
          label: "01 / THE CENTER",
          title: "KEEP THE CENTER OPEN",
          body: "密集的网络围绕着一个空的中心，让接口始终不会取代正在做决定的人。",
          readout: "FIELD / OPEN",
          metric: "AGENCY AT CENTER",
          note: "最重要的节点，是那个仍然可以自由选择的节点。"
        },
        {
          label: "02 / THE EDGE",
          title: "SET A SOFT BOUNDARY",
          body: "能力应该在场域边缘保持可见，并且可以被质疑、暂停和调整。",
          readout: "CONTROL / EXPLICIT",
          metric: "BOUNDARY HELD",
          note: "边界本身就是交互设计的一部分。"
        },
        {
          label: "03 / THE FUTURE",
          title: "LEAVE IT OPEN",
          body: "未来的接口应该邀请人参与，而不是绕开同意、控制和照护。",
          readout: "NEXT / UNWRITTEN",
          metric: "HUMAN AGENCY RETAINED",
          note: "这个场域最后留下的是问题，而不是一个封闭答案。"
        },
        {
          label: "04 / THREE QUESTIONS",
          title: "THREE QUESTIONS",
          body: "在每一次读取、反馈和适配之前，都要重新确认同意、控制和语境。",
          readout: "CONSENT / CONTROL / CONTEXT",
          metric: "BOUNDARY VISIBLE",
          note: "系统需要知道自己不知道什么。",
          visual: "three-questions"
        },
        {
          label: "05 / LEAVE IT OPEN",
          title: "LEAVE IT OPEN",
          body: "最好的未来界面，不是替人完成一切，而是让人始终参与决定。",
          readout: "NEXT / UNWRITTEN",
          metric: "HUMAN AGENCY RETAINED",
          note: "FROM NEURAL ACTIVITY TO CHOICE",
          visual: "open-ending"
        }
      ]
    }
  ]
};
